<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Plus, Minus, LocateFixed, FlaskConical, AlertTriangle, ShieldCheck
} from 'lucide-vue-next';

const props = defineProps({
  routes: { type: Array, default: () => [] },
  selectedId: { type: String, default: null },
  origin: { type: Object, default: () => ({ name: 'You are here', position: [26.8373, 75.5620] }) },
  destination: { type: Object, default: () => ({ name: 'Where to go ?', position: [26.8521, 75.5810] }) },
  dataSource: {
    type: String,
    default: 'live',
    validator: (v) => ['demo', 'live'].includes(v)
  },
  center: { type: Array, default: () => [26.8373, 75.5620] },
  zoom: { type: Number, default: 14 }
});

const emit = defineEmits(['select-route']);

const CONFIDENCE_STYLE = {
  verified: { label: 'Verified', icon: ShieldCheck, cls: 'bg-white text-black border-white' },
  incomplete: { label: 'Incomplete', icon: AlertTriangle, cls: 'bg-[#1D1F24] text-white border-[#343740]' },
  simulated: { label: 'Simulated', icon: FlaskConical, cls: 'bg-[#282A30] text-gray-300 border-dashed border-[#484B52]' }
};

const formatDuration = (min) => {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m ? `${h}h ${m}min` : `${h}h`;
};

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

const drawable = computed(() =>
  props.routes.filter((r) => Array.isArray(r.path) && r.path.length > 1)
);

const selectedRoute = computed(
  () => props.routes.find((r) => r.id === props.selectedId) ?? null
);

const stats = computed(() => {
  const r = selectedRoute.value;
  if (!r) return null;
  return {
    distanceKm: r.distanceKm,
    duration: formatDuration(r.durationMin),
    safety: r.safety ?? null,
    confidence: CONFIDENCE_STYLE[r.confidence] ?? CONFIDENCE_STYLE.incomplete
  };
});

const mapEl = ref(null);
let map = null;
let routeLayer = null;
let markerLayer = null;
let resizeObserver = null;

const whitePinIcon = (isOrigin) =>
  L.divIcon({
    className: 'np-icon-wrap',
    html: `
      <div class="np-white-pin ${isOrigin ? 'np-pin--start' : 'np-pin--dest'}">
        <span class="np-pin-core ${isOrigin ? 'np-core--circle' : 'np-core--square'}"></span>
      </div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11]
  });

const tagIcon = (id, selected) =>
  L.divIcon({
    className: 'np-icon-wrap',
    html: `<span class="np-tag ${selected ? 'np-tag--on' : ''}">${escapeHtml(id)}</span>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13]
  });

const addPin = (place, isOrigin) => {
  if (!place || !Array.isArray(place.position) || place.position.length !== 2) return;

  const marker = L.marker(place.position, {
    icon: whitePinIcon(isOrigin),
    title: place.name,
    keyboard: false,
    zIndexOffset: 1500
  }).addTo(markerLayer);

  if (place.name) {
    const label = document.createElement('span');
    label.textContent = place.name;
    marker.bindTooltip(label, {
      permanent: true,
      direction: 'top',
      offset: [0, -10],
      className: 'np-tooltip'
    });
  }
};

const draw = () => {
  if (!map) return;
  routeLayer.clearLayers();
  markerLayer.clearLayers();

  const ordered = [...drawable.value].sort(
    (a, b) => (a.id === props.selectedId) - (b.id === props.selectedId)
  );

  for (const route of ordered) {
    const selected = route.id === props.selectedId;

    if (selected) {
      // Glow/Drop shadow under active route
      L.polyline(route.path, {
        color: '#000000',
        weight: 10,
        opacity: 0.5,
        lineCap: 'round',
        lineJoin: 'round',
        interactive: false
      }).addTo(routeLayer);

      // Core Illuminated White Line
      const activeLine = L.polyline(route.path, {
        color: '#FFFFFF',
        weight: 6,
        opacity: 1,
        lineCap: 'round',
        lineJoin: 'round',
        bubblingMouseEvents: false
      }).addTo(routeLayer);

      activeLine.on('click', () => emit('select-route', route));
    } else {
      // Dimmed Unselected Alternative Routes
      const dimLine = L.polyline(route.path, {
        color: '#666666',
        weight: 4,
        opacity: 0.6,
        dashArray: '8 8',
        lineCap: 'round',
        lineJoin: 'round',
        bubblingMouseEvents: false
      }).addTo(routeLayer);

      dimLine.on('click', () => emit('select-route', route));
    }

    const mid = route.path[Math.floor(route.path.length / 2)];
    L.marker(mid, {
      icon: tagIcon(route.id, selected),
      title: `Route ${route.id}: ${route.name}`,
      zIndexOffset: selected ? 1000 : 0
    })
      .on('click', () => emit('select-route', route))
      .addTo(markerLayer);
  }

  addPin(props.origin, true);
  addPin(props.destination, false);
};

const fit = (selectedOnly = false) => {
  if (!map) return;
  const points = [];

  if (props.origin?.position) points.push(props.origin.position);
  if (props.destination?.position) points.push(props.destination.position);

  const only = selectedOnly ? selectedRoute.value : null;
  const paths = only && Array.isArray(only.path) && only.path.length > 1
    ? [only.path]
    : drawable.value.map((r) => r.path);

  paths.forEach((p) => points.push(...p));

  if (!points.length) {
    map.setView(props.center, props.zoom);
    return;
  }

  map.fitBounds(L.latLngBounds(points), {
    paddingTopLeft: [56, 64],
    paddingBottomRight: [56, 150],
    maxZoom: 16
  });
};

const zoomIn = () => map && map.zoomIn();
const zoomOut = () => map && map.zoomOut();
const recenter = () => fit(true);
defineExpose({ recenter });

onMounted(() => {
  map = L.map(mapEl.value, {
    zoomControl: false,
    attributionControl: false,
    center: props.center,
    zoom: props.zoom
  });

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19
  }).addTo(map);

  routeLayer = L.layerGroup().addTo(map);
  markerLayer = L.layerGroup().addTo(map);

  resizeObserver = new ResizeObserver(() => map && map.invalidateSize());
  resizeObserver.observe(mapEl.value);

  draw();
  fit();
});

onBeforeUnmount(() => {
  if (resizeObserver) resizeObserver.disconnect();
  if (map) map.remove();
  map = null;
});

watch(() => props.selectedId, draw);
watch(
  () => [props.routes, props.origin, props.destination],
  () => {
    draw();
    fit();
  },
  { deep: true }
);
</script>

<template>
  <section class="col-span-8 min-h-0 relative isolate rounded-[20px] overflow-hidden border border-[#343740] bg-[#1D1F24] monochrome-map">
    <div ref="mapEl" class="absolute inset-0" role="region" aria-label="Route map"></div>

    <div class="absolute top-4 left-4 z-[1000] flex flex-col items-start gap-2 pointer-events-none">
      <div
        v-if="selectedRoute"
        class="pointer-events-auto flex items-center gap-2 h-9 pl-1.5 pr-3 rounded-full bg-[#1D1F24] border border-[#343740] shadow-md"
      >
        <span class="w-6 h-6 rounded-full bg-white text-black text-[11px] font-bold flex items-center justify-center">{{ selectedRoute.id }}</span>
        <span class="text-xs font-semibold text-white">{{ selectedRoute.name }}</span>
      </div>
    </div>

    <div class="absolute top-4 right-4 z-[1000] flex flex-col items-center gap-2">
      <div class="flex flex-col rounded-full bg-[#1D1F24] border border-[#343740] shadow-md overflow-hidden">
        <button
          type="button"
          aria-label="Zoom in"
          @click="zoomIn"
          class="w-10 h-10 flex items-center justify-center text-white hover:bg-[#2B2D34] transition-colors"
        >
          <Plus class="w-4 h-4" />
        </button>
        <div class="h-px bg-[#343740]" aria-hidden="true"></div>
        <button
          type="button"
          aria-label="Zoom out"
          @click="zoomOut"
          class="w-10 h-10 flex items-center justify-center text-white hover:bg-[#2B2D34] transition-colors"
        >
          <Minus class="w-4 h-4" />
        </button>
      </div>

      <button
        type="button"
        aria-label="Recenter"
        @click="recenter"
        class="w-10 h-10 rounded-full bg-[#1D1F24] border border-[#343740] shadow-md flex items-center justify-center text-white hover:bg-[#2B2D34] transition-colors"
      >
        <LocateFixed class="w-4 h-4" />
      </button>
    </div>

    <div v-if="stats" class="absolute bottom-9 left-4 right-4 z-[1000] grid grid-cols-3 gap-3">
      <div class="rounded-2xl bg-[#1D1F24]/90 backdrop-blur-md border border-[#343740] shadow-md px-4 py-3">
        <p class="text-[11px] text-gray-400">Distance</p>
        <p class="text-2xl font-bold leading-tight text-white">
          {{ stats.distanceKm }} <span class="text-sm font-medium text-gray-400">km</span>
        </p>
      </div>

      <div class="rounded-2xl bg-[#1D1F24]/90 backdrop-blur-md border border-[#343740] shadow-md px-4 py-3">
        <p class="text-[11px] text-gray-400">Estimated time</p>
        <p class="text-2xl font-bold leading-tight text-white">{{ stats.duration }}</p>
      </div>

      <div class="rounded-2xl bg-[#1D1F24]/90 backdrop-blur-md border border-[#343740] shadow-md px-4 py-3">
        <p class="text-[11px] text-gray-400">Estimated safety</p>
        <div class="flex items-center justify-between gap-2">
          <p v-if="stats.safety !== null" class="text-2xl font-bold leading-tight text-white">
            {{ stats.safety }}<span class="text-sm font-medium text-gray-400">/100</span>
          </p>
          <p v-else class="text-2xl font-bold leading-tight text-gray-400">Unrated</p>
        </div>
      </div>
    </div>
  </section>
</template>

<style>
.monochrome-map .leaflet-tile-pane {
  filter: grayscale(100%) invert(92%) contrast(115%) brightness(80%);
}
.np-icon-wrap {
  background: transparent !important;
  border: 0 !important;
}

.np-white-pin {
  display: flex !important;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 9999px;
  background: #ffffff !important;
  border: 2px solid #000000 !important;
  box-shadow: 0 0 12px rgba(255, 255, 255, 0.8) !important;
}

.np-pin-core {
  display: block;
  background: #000000 !important;
}

.np-core--circle {
  width: 8px;
  height: 8px;
  border-radius: 9999px;
}

.np-core--square {
  width: 7px;
  height: 7px;
  border-radius: 2px;
}

.np-tag {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  box-sizing: border-box;
  border-radius: 9999px;
  background: #1D1F24;
  color: #ffffff;
  border: 2px solid #484B52;
  font: 700 11px/1 system-ui, sans-serif;
}
.np-tag--on {
  background: #ffffff;
  color: #000000;
  border-color: #ffffff;
}
.leaflet-tooltip.np-tooltip {
  background: #1D1F24 !important;
  color: #ffffff !important;
  border: 1px solid #343740 !important;
  border-radius: 8px;
  padding: 4px 8px;
  font: 600 11px/1.2 system-ui, sans-serif;
}
.leaflet-tooltip.np-tooltip::before {
  display: none !important;
}
.leaflet-container {
  font-family: inherit;
  background: #1D1F24 !important;
}
</style>