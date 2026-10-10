<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import Lenis from 'lenis';
import { DEMO_ROUTES } from '../data/demoRoutes.js';
import {
  ArrowRight, ArrowUpDown, AlertTriangle, FlaskConical, Loader2, LocateFixed, MapPin, ShieldCheck, X
} from 'lucide-vue-next';

const props = defineProps({
  routesList: {
    type: Array,
    default: () => DEMO_ROUTES
  },
  origin: {
    type: String,
    default: 'You are here'
  },
  destination: {
    type: String,
    default: 'Where to go ?'
  },
  selectedId: {
    type: String,
    default: null
  },
  dataSource: {
    type: String,
    default: 'demo',
    validator: (v) => ['demo', 'live'].includes(v)
  },
  loading: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['select-route', 'view-best-route', 'search']);

/* ---------- Score Helpers ---------- */
const getScoreColorClass = (score) => {
  if (score === null || score === undefined || score === '-') return 'text-amber-400';
  if (score >= 70) return 'text-emerald-400';
  if (score >= 40) return 'text-amber-400';
  return 'text-rose-400';
};

const localRoutes = ref([]);

watch(
  () => props.routesList,
  (newList) => {
    localRoutes.value = JSON.parse(JSON.stringify(newList));
  },
  { immediate: true, deep: true }
);

/* ---------- Safety Score Fluctuation ---------- */
let fluctuationInterval = null;

const startScoreFluctuation = () => {
  fluctuationInterval = setInterval(() => {
    localRoutes.value = localRoutes.value.map((route) => {
      if (route.safety === null || route.safety === undefined) return route;

      const delta = Math.floor(Math.random() * 3) + 1;
      const isPositive = Math.random() > 0.5;

      let newSafety = isPositive ? route.safety + delta : route.safety - delta;
      newSafety = Math.max(0, Math.min(100, newSafety));

      let updatedFactors = route.factors;
      if (Array.isArray(route.factors) && route.factors.length > 0) {
        updatedFactors = route.factors.map((factor) => {
          if (factor.value === null) return factor;
          const factorDelta = Math.floor(Math.random() * 3) + 1;
          const factorPos = Math.random() > 0.5;
          const newVal = factorPos ? factor.value + factorDelta : factor.value - factorDelta;
          return { ...factor, value: Math.max(0, Math.min(100, newVal)) };
        });
      }

      return { ...route, safety: newSafety, factors: updatedFactors };
    });
  }, 5000);
};

/* ---------- Lenis Scroll ---------- */
const scrollContainer = ref(null);
let lenis = null;
let animationFrameId = null;

onMounted(() => {
  startScoreFluctuation();

  if (scrollContainer.value) {
    lenis = new Lenis({
      wrapper: scrollContainer.value,
      content: scrollContainer.value.firstElementChild,
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1,
    });

    function raf(time) {
      lenis?.raf(time);
      animationFrameId = requestAnimationFrame(raf);
    }
    animationFrameId = requestAnimationFrame(raf);
  }
});

onUnmounted(() => {
  if (fluctuationInterval) clearInterval(fluctuationInterval);
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  if (lenis) lenis.destroy();
  sourceSuggest.reset();
  destSuggest.reset();
});

/* ---------- Confidence Badges ---------- */
const CONFIDENCE = {
  verified: { label: 'Verified', icon: ShieldCheck, cls: 'bg-white text-black border-white' },
  incomplete: { label: 'Incomplete', icon: AlertTriangle, cls: 'bg-[#1D1F24] text-white border-[#343740]' },
  simulated: { label: 'Simulated', icon: FlaskConical, cls: 'bg-[#282A30] text-gray-300 border-dashed border-[#484B52]' }
};

const confidenceOf = (key) => CONFIDENCE[key] ?? CONFIDENCE.incomplete;

/* ---------- Sort Bar Pill ---------- */
const SORT_OPTIONS = [
  { value: 'safest', label: 'Safest' },
  { value: 'fastest', label: 'Fastest' },
  { value: 'shortest', label: 'Shortest' }
];
const sortBy = ref('safest');
const sortNavRef = ref(null);
const sortBtnRefs = ref({});
const sortPillStyle = ref({ transform: 'translateX(0px)', width: '0px' });
const isSortPillReady = ref(false);

const updateSortPill = () => {
  const activeBtn = sortBtnRefs.value[sortBy.value];
  const container = sortNavRef.value;
  if (activeBtn && container) {
    const activeRect = activeBtn.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    sortPillStyle.value = {
      transform: `translateX(${activeRect.left - containerRect.left}px)`,
      width: `${activeRect.width}px`
    };
    isSortPillReady.value = true;
  }
};

/* ---------- Route Items Vertical Pill ---------- */
const routesNavRef = ref(null);
const routeBtnRefs = ref({});
const routePillStyle = ref({ transform: 'translateY(0px)', height: '0px', width: '100%' });
const isRoutePillReady = ref(false);

const selectedRouteId = ref(props.selectedId);

const updateRoutePill = (animate = true) => {
  const activeBtn = routeBtnRefs.value[selectedRouteId.value];
  const container = routesNavRef.value;
  if (activeBtn && container) {
    const activeRect = activeBtn.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    routePillStyle.value = {
      transform: `translateY(${activeRect.top - containerRect.top}px)`,
      height: `${activeRect.height}px`,
      width: `${activeRect.width}px`,
      transition: animate ? 'transform var(--p16-dur) var(--p16-ease), height var(--p16-dur) var(--p16-ease)' : 'none'
    };
    isRoutePillReady.value = true;
  }
};

watch(sortBy, async () => {
  await nextTick();
  updateSortPill();
});

watch(selectedRouteId, async () => {
  await nextTick();
  updateRoutePill(true);
});

const handleSelect = (route) => {
  selectedRouteId.value = route.id;
  emit('select-route', route);
};

const sortedRoutes = computed(() => {
  const compare = {
    safest: (a, b) => (b.safety ?? -1) - (a.safety ?? -1) || a.durationMin - b.durationMin,
    fastest: (a, b) => a.durationMin - b.durationMin,
    shortest: (a, b) => a.distanceKm - b.distanceKm
  }[sortBy.value];
  return [...localRoutes.value].sort(compare);
});

const bestRoute = computed(() => {
  const rated = localRoutes.value.filter((r) => r.safety !== null && r.safety !== undefined);
  if (!rated.length) return null;
  return [...rated].sort((a, b) => b.safety - a.safety || a.durationMin - b.durationMin)[0];
});

const selectedRoute = computed(
  () => localRoutes.value.find((r) => r.id === selectedRouteId.value) ?? null
);

watch(
  () => props.selectedId,
  (id) => {
    if (id && localRoutes.value.some((r) => r.id === id)) selectedRouteId.value = id;
  }
);

watch(
  localRoutes,
  (list) => {
    if (list.some((r) => r.id === selectedRouteId.value)) return;
    const next = bestRoute.value ?? sortedRoutes.value[0] ?? null;
    selectedRouteId.value = next ? next.id : null;
    if (next) emit('select-route', next);
  },
  { immediate: true }
);

onMounted(() => {
  nextTick(() => {
    updateSortPill();
    updateRoutePill(false);
    window.addEventListener('resize', () => {
      updateSortPill();
      updateRoutePill(false);
    });
  });
});

/* ---------- transitions.dev Calculations ---------- */
function readNum(name, fb) {
  const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
  return Number.isFinite(v) ? v : fb;
}

function readEase(name, fb) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fb;
}

function makeEase(ease) {
  const m = ease.match(/cubic-bezier\s*\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)/i);
  if (!m) return (t) => t;
  const [x1, y1, x2, y2] = [m[1], m[2], m[3], m[4]].map(parseFloat);
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sX = (s) => ((ax * s + bx) * s + cx) * s;
  const sY = (s) => ((ay * s + by) * s + cy) * s;
  const dX = (s) => (3 * ax * s + 2 * bx) * s + cx;
  return (t) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    let s = t;
    for (let i = 0; i < 8; i++) {
      const dx = sX(s) - t;
      if (Math.abs(dx) < 1e-6) break;
      const d = dX(s);
      if (d === 0) break;
      s -= dx / d;
    }
    return sY(s);
  };
}

let canvasCtx = null;
function buildLayers(wrap, text) {
  const inputW = wrap.clientWidth || 280;
  const padLeft = 32;
  const segments = text.split(/(\s+)/);
  const spread = readNum("--glow-spread", 1.5);
  if (!canvasCtx) {
    const c = document.createElement("canvas").getContext("2d");
    c.font = "400 12px Inter, sans-serif";
    canvasCtx = c;
  }
  const rgb = "255,255,255";
  const layers = [];
  let x = 0;
  for (const seg of segments) {
    const w = canvasCtx.measureText(seg).width;
    if (seg.trim()) {
      const cx = padLeft + x + w / 2;
      const hw = Math.max(w * 0.45, 8) * spread;
      const stops = [
        { dx: 0, rw: hw * 0.8, rh: 7, a: 0.22 },
        { dx: hw * 0.45, rw: hw * 0.55, rh: 8, a: 0.18 },
        { dx: -hw * 0.4, rw: hw * 0.65, rh: 6, a: 0.16 },
        { dx: hw * 0.15, rw: hw * 0.9, rh: 5, a: 0.14 },
      ];
      for (const l of stops) {
        const lx = ((cx + l.dx) / inputW * 100).toFixed(2);
        layers.push(
          `radial-gradient(ellipse ${Math.max(l.rw, 2).toFixed(1)}px ${l.rh}px at ${lx}% 100%, rgba(${rgb},${l.a.toFixed(3)}), transparent)`
        );
      }
    }
    x += w;
  }
  return layers.join(", ");
}

/* ---------- Source & Destination Reactive State ---------- */
const sourceQuery = ref(props.origin);
const destQuery = ref(props.destination);

const sourceWrapRef = ref(null);
const sourceInputRef = ref(null);
const sourceMirrorRef = ref(null);
const sourceFakePhRef = ref(null);
const sourceGlowRef = ref(null);
const isClearingSource = ref(false);

const destWrapRef = ref(null);
const destInputRef = ref(null);
const destMirrorRef = ref(null);
const destFakePhRef = ref(null);
const destGlowRef = ref(null);
const isClearingDest = ref(false);

const touched = ref(false);

/* ---------- Location Suggestions (autocomplete) ---------- */
// Photon (OpenStreetMap) is free and built for search-as-you-type. Fine for demos;
// for production traffic swap in Geoapify / MapTiler / Mapbox / Google Places.
// Only the URL and the response mapping inside `fetchPlaces` need to change.
const GEOCODER_URL = 'https://photon.komoot.io/api/';
const GEO_BIAS = { lat: 26.9124, lon: 75.7873 }; // rank Jaipur results first
const GEO_BBOX = '68.1,6.7,97.4,35.7';            // India. Set to '' to search worldwide.
const SUGGEST_MIN_CHARS = 3;
const SUGGEST_DEBOUNCE_MS = 300;

const fetchPlaces = async (query, signal) => {
  const params = new URLSearchParams({
    q: query,
    limit: '6',
    lang: 'en',
    lat: String(GEO_BIAS.lat),
    lon: String(GEO_BIAS.lon)
  });
  if (GEO_BBOX) params.set('bbox', GEO_BBOX);

  const res = await fetch(`${GEOCODER_URL}?${params}`, { signal });
  if (!res.ok) throw new Error(`Geocoder responded ${res.status}`);
  const data = await res.json();

  const seen = new Set();
  return data.features
    .map((f) => {
      const p = f.properties;
      const name = p.name || p.street || p.city || '';
      const subtitle = [p.street, p.district || p.locality, p.city, p.state]
        .filter((part) => part && part !== name)
        .join(', ');
      return {
        id: `${p.osm_type}${p.osm_id}`,
        name,
        subtitle,
        lat: f.geometry.coordinates[1],
        lng: f.geometry.coordinates[0]
      };
    })
    .filter((place) => {
      if (!place.name || seen.has(place.id)) return false;
      seen.add(place.id);
      return true;
    });
};

const GEO_OPTION = { id: '__geo', name: 'Use current location', subtitle: '', isGeo: true };

const makeSuggester = ({ withGeoOption = false } = {}) => {
  const state = reactive({
    items: [],
    open: false,
    active: -1,
    status: 'idle', // 'idle' | 'loading' | 'done' | 'error'
    options: computed(() => (withGeoOption ? [GEO_OPTION, ...state.items] : state.items)),
    visible: computed(() => state.open && (state.options.length > 0 || state.status !== 'idle'))
  });

  let timer = null;
  let controller = null;

  state.close = () => {
    state.open = false;
    state.active = -1;
  };

  state.reset = () => {
    clearTimeout(timer);
    controller?.abort();
    controller = null;
    state.items = [];
    state.status = 'idle';
    state.active = -1;
  };

  state.search = (text) => {
    clearTimeout(timer);
    controller?.abort();
    controller = null;
    state.active = -1;

    const q = text.trim();
    if (q.length < SUGGEST_MIN_CHARS) {
      state.items = [];
      state.status = 'idle';
      state.open = withGeoOption; // source field still shows "Use current location"
      return;
    }

    state.open = true;
    state.status = 'loading';
    timer = setTimeout(async () => {
      const mine = new AbortController();
      controller = mine;
      try {
        state.items = await fetchPlaces(q, mine.signal);
        state.status = 'done';
      } catch (err) {
        if (err.name === 'AbortError') return; // a newer search replaced this one
        state.items = [];
        state.status = 'error';
      }
    }, SUGGEST_DEBOUNCE_MS);
  };

  return state;
};

const sourceSuggest = reactive(makeSuggester({ withGeoOption: true }));
const destSuggest = reactive(makeSuggester());

// [lat, lng] of the chosen suggestion. null means the text was typed by hand.
const sourcePos = ref(null);
const destPos = ref(null);

const locating = ref(false);
const geoError = ref('');

const onSourceInput = (e) => {
  sourcePos.value = null;
  geoError.value = '';
  sourceSuggest.search(e.target.value);
};

const onDestInput = (e) => {
  destPos.value = null;
  destSuggest.search(e.target.value);
};

const onSourceFocus = () => {
  // Show "Use current location" right away, or any suggestions already loaded.
  sourceSuggest.open = true;
};

const onDestFocus = () => {
  if (destSuggest.items.length) destSuggest.open = true;
};

const pickSource = (opt) => {
  if (opt.isGeo) {
    useMyLocation();
    return;
  }
  sourceQuery.value = opt.name;
  sourcePos.value = [opt.lat, opt.lng];
  geoError.value = '';
  sourceSuggest.reset();
  sourceSuggest.close();
};

const pickDest = (opt) => {
  destQuery.value = opt.name;
  destPos.value = [opt.lat, opt.lng];
  destSuggest.reset();
  destSuggest.close();
};

const useMyLocation = () => {
  geoError.value = '';
  if (!navigator.geolocation) {
    geoError.value = 'Location is not supported in this browser.';
    sourceSuggest.close();
    return;
  }
  locating.value = true;
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      sourceQuery.value = 'Current location';
      sourcePos.value = [pos.coords.latitude, pos.coords.longitude];
      locating.value = false;
      sourceSuggest.reset();
      sourceSuggest.close();
    },
    () => {
      locating.value = false;
      geoError.value = "Couldn't get your location. Allow location access in your browser.";
      sourceSuggest.close();
    },
    { enableHighAccuracy: true, timeout: 8000 }
  );
};

const scrollActiveIntoView = (prefix, index) => {
  nextTick(() => {
    document.getElementById(`${prefix}-opt-${index}`)?.scrollIntoView({ block: 'nearest' });
  });
};

const onSuggestKeydown = (e, suggest, prefix, pick) => {
  const count = suggest.options.length;

  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    if (!count) return;
    e.preventDefault();
    if (!suggest.visible) {
      suggest.open = true;
      return;
    }
    const step = e.key === 'ArrowDown' ? 1 : -1;
    suggest.active = suggest.active < 0
      ? (step === 1 ? 0 : count - 1)
      : (suggest.active + step + count) % count;
    scrollActiveIntoView(prefix, suggest.active);
  } else if (e.key === 'Enter') {
    if (suggest.visible && suggest.active >= 0) {
      e.preventDefault(); // pick the suggestion instead of submitting the form
      pick(suggest.options[suggest.active]);
    } else {
      suggest.close();
    }
  } else if (e.key === 'Escape' && suggest.visible) {
    e.preventDefault();
    suggest.close();
  }
};

/* Perform Clear Animation */
const runClearAnimation = ({
  wrap, input, mirror, fakePh, glow, queryRef, clearingFlag, placeholder
}) => {
  if (!wrap || !input || !mirror || !fakePh || !glow) return;
  if (clearingFlag.value || !queryRef.value) return;

  clearingFlag.value = true;
  const wasFocused = document.activeElement === input;
  const text = queryRef.value.replace(/ /g, "\u00a0");
  mirror.textContent = text;

  const bg = buildLayers(wrap, text);
  const peakAt = readNum("--glow-peak-at", 0.15);
  const opacity = readNum("--glow-opacity", 0.85);
  const total = readNum("--clear-dur", 1000);
  const outDur = readNum("--clear-out-dur", 400);
  const inDur = readNum("--clear-in-dur", 400);
  const outFly = readNum("--clear-out-fly", 12);
  const inFly = readNum("--clear-in-fly", 12);
  const blurPx = readNum("--clear-blur", 2);
  const glowDly = readNum("--glow-delay", 50);

  const eOut = makeEase(readEase("--clear-out-ease", "cubic-bezier(0.22, 1, 0.36, 1)"));
  const eIn = makeEase(readEase("--clear-in-ease", "cubic-bezier(0.22, 1, 0.36, 1)"));

  queryRef.value = "";
  wrap.classList.remove("has-value");
  wrap.classList.add("is-clearing");

  fakePh.textContent = placeholder;
  fakePh.style.transform = `translateY(-${inFly}px)`;
  fakePh.style.opacity = "0.9";
  fakePh.style.filter = `blur(${blurPx}px)`;

  glow.style.background = bg;
  glow.style.opacity = "0";

  const start = performance.now();
  const tick = (now) => {
    const elapsed = now - start;
    const p = Math.min(1, elapsed / total);

    const e = eOut(Math.min(1, elapsed / outDur));
    mirror.style.transform = `translateY(${(e * outFly).toFixed(1)}px)`;
    mirror.style.opacity = (1 - e).toFixed(3);
    mirror.style.filter = `blur(${(e * blurPx).toFixed(1)}px)`;

    const pe = eIn(Math.min(1, elapsed / inDur));
    fakePh.style.transform = `translateY(${(-inFly + pe * inFly).toFixed(1)}px)`;
    fakePh.style.opacity = (0.9 + pe * 0.1).toFixed(3);
    fakePh.style.filter = `blur(${(blurPx - pe * blurPx).toFixed(1)}px)`;

    let g = 0;
    if (elapsed > glowDly) {
      const remaining = Math.max(1, total - glowDly);
      const gp = Math.min(1, (elapsed - glowDly) / remaining);
      g = gp < peakAt ? gp / peakAt : 1 - (gp - peakAt) / (1 - peakAt);
    }
    glow.style.opacity = (g * opacity).toFixed(3);

    if (p < 1) {
      requestAnimationFrame(tick);
    } else {
      wrap.classList.remove("is-clearing");
      for (const el of [mirror, fakePh]) el.style.cssText = "";
      mirror.textContent = "";
      glow.style.opacity = "0";
      glow.style.background = "";
      clearingFlag.value = false;
      if (wasFocused) input.focus({ preventScroll: true });
    }
  };
  requestAnimationFrame(tick);
};

const clearSource = () => {
  sourcePos.value = null;
  geoError.value = '';
  sourceSuggest.reset();
  sourceSuggest.search(''); // keeps "Use current location" visible while the field is empty
  runClearAnimation({
    wrap: sourceWrapRef.value,
    input: sourceInputRef.value,
    mirror: sourceMirrorRef.value,
    fakePh: sourceFakePhRef.value,
    glow: sourceGlowRef.value,
    queryRef: sourceQuery,
    clearingFlag: isClearingSource,
    placeholder: 'You are here'
  });
};

const clearDest = () => {
  destPos.value = null;
  destSuggest.reset();
  destSuggest.close();
  runClearAnimation({
    wrap: destWrapRef.value,
    input: destInputRef.value,
    mirror: destMirrorRef.value,
    fakePh: destFakePhRef.value,
    glow: destGlowRef.value,
    queryRef: destQuery,
    clearingFlag: isClearingDest,
    placeholder: 'Where to go ?'
  });
};

watch(
  () => [props.origin, props.destination],
  ([o, d]) => {
    sourceQuery.value = o;
    destQuery.value = d;
    sourcePos.value = null;
    destPos.value = null;
  }
);

const sourceError = computed(() => (sourceQuery.value.trim() ? '' : 'Enter a starting point.'));
const destError = computed(() => {
  const dest = destQuery.value.trim();
  if (!dest) return 'Enter a destination.';
  if (dest.toLowerCase() === sourceQuery.value.trim().toLowerCase()) {
    return 'Destination must be different from the starting point.';
  }
  return '';
});
const showSourceError = computed(() => touched.value && !!sourceError.value);
const showDestError = computed(() => touched.value && !!destError.value);

const swapLocations = () => {
  [sourceQuery.value, destQuery.value] = [destQuery.value, sourceQuery.value];
  [sourcePos.value, destPos.value] = [destPos.value, sourcePos.value];
  geoError.value = '';
  for (const s of [sourceSuggest, destSuggest]) {
    s.reset();
    s.close();
  }
};

const submit = () => {
  touched.value = true;
  sourceSuggest.close();
  destSuggest.close();
  if (sourceError.value || destError.value || props.loading) return;
  emit('search', {
    source: sourceQuery.value.trim(),
    destination: destQuery.value.trim(),
    // [lat, lng] when picked from suggestions / current location, otherwise null
    sourcePos: sourcePos.value,
    destPos: destPos.value
  });
};
</script>

<template>
  <section ref="scrollContainer" class="col-span-4 flex flex-col gap-4 overflow-y-auto pr-1 h-full">
    <div class="flex flex-col gap-4">
      <!-- Routes Card -->
      <div class="bg-[#1D1F24] rounded-[20px] p-4 border border-[#343740] flex flex-col gap-3 text-white">
        <div class="flex items-center justify-between">
          <h2 class="font-semibold text-sm text-white">Routes</h2>
          <span
            v-if="!loading && !error && localRoutes.length"
            class="text-[11px] font-medium text-gray-400"
          >
            {{ localRoutes.length }} {{ localRoutes.length === 1 ? 'option' : 'options' }}
          </span>
        </div>

        <!-- Start / Destination Form with Corrected Non-overlapping Input Layout -->
        <form class="flex flex-col gap-2" novalidate @submit.prevent="submit">
          <div class="flex items-center gap-2">
            <div class="flex-1 min-w-0 flex flex-col gap-2">
              
              <!-- Source Search Bar -->
              <div class="relative">
                <label for="np-source" class="sr-only">Starting point</label>
                <div
                  ref="sourceWrapRef"
                  :class="[
                    't-clear flex items-center gap-2 h-10 px-3 rounded-xl border bg-[#18191C] transition-colors focus-within:border-white relative overflow-hidden',
                    sourceQuery ? 'has-value' : '',
                    showSourceError ? 'border-white' : 'border-[#343740]'
                  ]"
                >
                  <span class="w-2 h-2 rounded-full bg-white shrink-0 z-10" aria-hidden="true"></span>
                  
                  <div class="relative flex-1 h-full flex items-center min-w-0 z-10">
                    <input
                      id="np-source"
                      ref="sourceInputRef"
                      v-model="sourceQuery"
                      type="text"
                      autocomplete="off"
                      role="combobox"
                      aria-autocomplete="list"
                      aria-controls="np-source-list"
                      :aria-expanded="sourceSuggest.visible"
                      :aria-activedescendant="sourceSuggest.visible && sourceSuggest.active >= 0 ? `np-source-opt-${sourceSuggest.active}` : undefined"
                      @input="onSourceInput"
                      @focus="onSourceFocus"
                      @blur="sourceSuggest.close()"
                      @keydown="onSuggestKeydown($event, sourceSuggest, 'np-source', pickSource)"
                      :aria-invalid="showSourceError"
                      class="bg-transparent text-xs outline-none w-full text-white z-10 relative"
                    />

                    <div ref="sourceMirrorRef" class="t-clear-mirror text-xs text-white !p-0" aria-hidden="true"></div>
                    <div ref="sourceFakePhRef" class="t-clear-placeholder text-xs text-gray-500 !p-0" aria-hidden="true">You are here</div>
                  </div>

                  <div ref="sourceGlowRef" class="t-clear-glow" aria-hidden="true"></div>

                  <button
                    v-if="sourceQuery"
                    type="button"
                    @click="clearSource"
                    class="text-gray-400 hover:text-white transition-colors cursor-pointer shrink-0 z-10"
                    aria-label="Clear starting point"
                  >
                    <X class="w-3.5 h-3.5" />
                  </button>
                </div>
                <p v-if="showSourceError" class="mt-1 flex items-center gap-1 text-[11px] text-white">
                  <AlertTriangle class="w-3 h-3 shrink-0" aria-hidden="true" />{{ sourceError }}
                </p>
                <p v-if="geoError" class="mt-1 flex items-center gap-1 text-[11px] text-white">
                  <AlertTriangle class="w-3 h-3 shrink-0" aria-hidden="true" />{{ geoError }}
                </p>

                <!-- Source Suggestions Dropdown -->
                <ul
                  v-if="sourceSuggest.visible"
                  id="np-source-list"
                  role="listbox"
                  aria-label="Starting point suggestions"
                  data-lenis-prevent
                  @mousedown.prevent
                  class="absolute left-0 right-0 top-[2.75rem] z-50 max-h-60 overflow-y-auto rounded-xl border border-[#343740] bg-[#18191C] py-1 shadow-xl shadow-black/50"
                >
                  <li
                    v-for="(opt, i) in sourceSuggest.options"
                    :id="`np-source-opt-${i}`"
                    :key="opt.id"
                    role="option"
                    :aria-selected="i === sourceSuggest.active"
                    @mouseenter="sourceSuggest.active = i"
                    @click="pickSource(opt)"
                    :class="[
                      'flex items-start gap-2.5 px-3 py-2 cursor-pointer transition-colors',
                      i === sourceSuggest.active ? 'bg-[#2B2D34]' : ''
                    ]"
                  >
                    <Loader2 v-if="opt.isGeo && locating" class="w-3.5 h-3.5 mt-0.5 shrink-0 animate-spin text-gray-400" aria-hidden="true" />
                    <component
                      :is="opt.isGeo ? LocateFixed : MapPin"
                      v-else
                      class="w-3.5 h-3.5 mt-0.5 shrink-0 text-gray-400"
                      aria-hidden="true"
                    />
                    <span class="min-w-0">
                      <span class="block text-xs font-medium text-white truncate">{{ opt.name }}</span>
                      <span v-if="opt.subtitle" class="block text-[11px] text-gray-400 truncate">{{ opt.subtitle }}</span>
                    </span>
                  </li>

                  <li
                    v-if="sourceSuggest.status === 'loading' && !sourceSuggest.items.length"
                    role="presentation"
                    class="flex items-center gap-2 px-3 py-2 text-[11px] text-gray-400"
                  >
                    <Loader2 class="w-3 h-3 animate-spin" aria-hidden="true" />Searching…
                  </li>
                  <li
                    v-else-if="sourceSuggest.status === 'error'"
                    role="presentation"
                    class="px-3 py-2 text-[11px] text-gray-400"
                  >
                    Couldn't load suggestions. Check your connection and keep typing.
                  </li>
                  <li
                    v-else-if="sourceSuggest.status === 'done' && !sourceSuggest.items.length"
                    role="presentation"
                    class="px-3 py-2 text-[11px] text-gray-400"
                  >
                    No places found. Try a different name.
                  </li>
                </ul>
              </div>

              <!-- Destination Search Bar -->
              <div class="relative">
                <label for="np-dest" class="sr-only">Destination</label>
                <div
                  ref="destWrapRef"
                  :class="[
                    't-clear flex items-center gap-2 h-10 px-3 rounded-xl border bg-[#18191C] transition-colors focus-within:border-white relative overflow-hidden',
                    destQuery ? 'has-value' : '',
                    showDestError ? 'border-white' : 'border-[#343740]'
                  ]"
                >
                  <span class="w-2 h-2 rounded-full border border-white bg-transparent shrink-0 z-10" aria-hidden="true"></span>
                  
                  <div class="relative flex-1 h-full flex items-center min-w-0 z-10">
                    <input
                      id="np-dest"
                      ref="destInputRef"
                      v-model="destQuery"
                      type="text"
                      autocomplete="off"
                      role="combobox"
                      aria-autocomplete="list"
                      aria-controls="np-dest-list"
                      :aria-expanded="destSuggest.visible"
                      :aria-activedescendant="destSuggest.visible && destSuggest.active >= 0 ? `np-dest-opt-${destSuggest.active}` : undefined"
                      @input="onDestInput"
                      @focus="onDestFocus"
                      @blur="destSuggest.close()"
                      @keydown="onSuggestKeydown($event, destSuggest, 'np-dest', pickDest)"
                      :aria-invalid="showDestError"
                      class="bg-transparent text-xs outline-none w-full text-white z-10 relative"
                    />

                    <div ref="destMirrorRef" class="t-clear-mirror text-xs text-white !p-0" aria-hidden="true"></div>
                    <div ref="destFakePhRef" class="t-clear-placeholder text-xs text-gray-500 !p-0" aria-hidden="true">Where to go ?</div>
                  </div>

                  <div ref="destGlowRef" class="t-clear-glow" aria-hidden="true"></div>

                  <button
                    v-if="destQuery"
                    type="button"
                    @click="clearDest"
                    class="text-gray-400 hover:text-white transition-colors cursor-pointer shrink-0 z-10"
                    aria-label="Clear destination"
                  >
                    <X class="w-3.5 h-3.5" />
                  </button>
                </div>
                <p v-if="showDestError" class="mt-1 flex items-center gap-1 text-[11px] text-white">
                  <AlertTriangle class="w-3 h-3 shrink-0" aria-hidden="true" />{{ destError }}
                </p>

                <!-- Destination Suggestions Dropdown -->
                <ul
                  v-if="destSuggest.visible"
                  id="np-dest-list"
                  role="listbox"
                  aria-label="Destination suggestions"
                  data-lenis-prevent
                  @mousedown.prevent
                  class="absolute left-0 right-0 top-[2.75rem] z-50 max-h-60 overflow-y-auto rounded-xl border border-[#343740] bg-[#18191C] py-1 shadow-xl shadow-black/50"
                >
                  <li
                    v-for="(opt, i) in destSuggest.options"
                    :id="`np-dest-opt-${i}`"
                    :key="opt.id"
                    role="option"
                    :aria-selected="i === destSuggest.active"
                    @mouseenter="destSuggest.active = i"
                    @click="pickDest(opt)"
                    :class="[
                      'flex items-start gap-2.5 px-3 py-2 cursor-pointer transition-colors',
                      i === destSuggest.active ? 'bg-[#2B2D34]' : ''
                    ]"
                  >
                    <MapPin class="w-3.5 h-3.5 mt-0.5 shrink-0 text-gray-400" aria-hidden="true" />
                    <span class="min-w-0">
                      <span class="block text-xs font-medium text-white truncate">{{ opt.name }}</span>
                      <span v-if="opt.subtitle" class="block text-[11px] text-gray-400 truncate">{{ opt.subtitle }}</span>
                    </span>
                  </li>

                  <li
                    v-if="destSuggest.status === 'loading' && !destSuggest.items.length"
                    role="presentation"
                    class="flex items-center gap-2 px-3 py-2 text-[11px] text-gray-400"
                  >
                    <Loader2 class="w-3 h-3 animate-spin" aria-hidden="true" />Searching…
                  </li>
                  <li
                    v-else-if="destSuggest.status === 'error'"
                    role="presentation"
                    class="px-3 py-2 text-[11px] text-gray-400"
                  >
                    Couldn't load suggestions. Check your connection and keep typing.
                  </li>
                  <li
                    v-else-if="destSuggest.status === 'done' && !destSuggest.items.length"
                    role="presentation"
                    class="px-3 py-2 text-[11px] text-gray-400"
                  >
                    No places found. Try a different name.
                  </li>
                </ul>
              </div>

            </div>

            <button
              type="button"
              aria-label="Swap starting point and destination"
              @click="swapLocations"
              class="w-9 h-9 shrink-0 rounded-full bg-[#2B2D34] border border-[#343740] text-white flex items-center justify-center hover:bg-[#343740] transition-colors cursor-pointer"
            >
              <ArrowUpDown class="w-4 h-4" />
            </button>
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="h-10 rounded-xl bg-white text-black text-xs font-semibold flex items-center justify-center gap-2 hover:bg-gray-200 disabled:bg-[#484B52] disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <Loader2 v-if="loading" class="w-4 h-4 animate-spin" aria-hidden="true" />
            {{ loading ? 'Finding routes…' : 'Find routes' }}
          </button>
        </form>

        <!-- Sort Controls -->
        <div v-if="localRoutes.length" class="flex items-center justify-between gap-2 pt-1">
          <p class="text-xs font-medium text-gray-300">Sort by</p>

          <div
            ref="sortNavRef"
            class="relative inline-flex p-1 rounded-full bg-[#18191C] border border-[#343740]"
          >
            <div
              v-show="isSortPillReady"
              class="absolute top-1 bottom-1 bg-white rounded-full pointer-events-none transition-all duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] shadow-sm z-0"
              :style="sortPillStyle"
            ></div>

            <button
              v-for="opt in SORT_OPTIONS"
              :key="opt.value"
              :ref="(el) => { if (el) sortBtnRefs[opt.value] = el }"
              type="button"
              @click="sortBy = opt.value"
              :class="[
                'relative z-10 px-3.5 py-1 rounded-full text-xs font-semibold transition-colors duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] cursor-pointer',
                sortBy === opt.value ? 'text-black' : 'text-gray-400 hover:text-white'
              ]"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>

        <!-- Route List Rows -->
        <div
          v-if="localRoutes.length"
          ref="routesNavRef"
          class="relative flex flex-col gap-2 p-1"
          role="tablist"
          aria-label="Routes List"
        >
          <div
            v-show="isRoutePillReady"
            class="absolute left-1 right-1 rounded-2xl bg-[#2B2D34] border border-white/80 pointer-events-none z-0 p16-route-indicator"
            :style="routePillStyle"
          ></div>

          <button
            v-for="route in sortedRoutes"
            :key="route.id"
            :ref="(el) => { if (el) routeBtnRefs[route.id] = el }"
            type="button"
            role="tab"
            :aria-selected="selectedRouteId === route.id"
            @click="handleSelect(route)"
            class="relative z-10 w-full grid grid-cols-[28px_1fr_auto_auto] items-center gap-3 text-left px-3.5 py-3 rounded-2xl border border-transparent transition-colors duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] cursor-pointer focus-visible:outline-2 focus-visible:outline-white"
          >
            <span
              :class="[
                'w-7 h-7 rounded-full text-[11px] font-bold flex items-center justify-center transition-colors duration-250 ease-[cubic-bezier(0.22,1,0.36,1)]',
                selectedRouteId === route.id ? 'bg-white text-black' : 'bg-[#282A30] text-white'
              ]"
            >{{ route.id }}</span>

            <span class="min-w-0">
              <span class="block text-xs font-semibold text-white truncate">{{ route.name }}</span>
              <span
                :class="[
                  'mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] font-medium',
                  confidenceOf(route.confidence).cls
                ]"
              >
                <component :is="confidenceOf(route.confidence).icon" class="w-2.5 h-2.5" aria-hidden="true" />
                {{ confidenceOf(route.confidence).label }}
              </span>
            </span>

            <span class="text-right">
              <span class="block text-sm font-bold text-white">{{ route.durationMin }} min</span>
              <span class="block text-[10px] text-gray-400">{{ route.distanceKm }} km</span>
            </span>

            <span class="w-12 py-1 text-center rounded-lg border border-[#343740] bg-[#18191C]">
              <template v-if="route.safety !== null && route.safety !== undefined">
                <span
                  :key="route.safety"
                  :class="['block text-sm font-bold leading-none t-num-pop transition-colors duration-300', getScoreColorClass(route.safety)]"
                >{{ route.safety }}</span>
                <span class="mt-0.5 block text-[10px] leading-none text-gray-400">Safety</span>
              </template>
              <template v-else>
                <span class="block text-sm font-bold leading-none text-amber-400">–</span>
                <span class="mt-0.5 block text-[10px] leading-none text-gray-400">Unrated</span>
              </template>
            </span>
          </button>
        </div>

        <!-- Score Explanation -->
        <div
          v-if="selectedRoute"
          class="rounded-xl border border-[#343740] bg-[#18191C] p-3 flex flex-col gap-3 text-white"
        >
          <p class="text-xs font-semibold">
            <template v-if="selectedRoute.safety !== null && selectedRoute.safety !== undefined">
              Why Route {{ selectedRoute.id }} scores 
              <span
                :key="selectedRoute.safety"
                :class="['t-num-pop inline-block font-bold transition-colors duration-300', getScoreColorClass(selectedRoute.safety)]"
              >{{ selectedRoute.safety }}</span>/100
            </template>
            <template v-else>Route {{ selectedRoute.id }} can't be rated yet</template>
          </p>

          <ul class="flex flex-col gap-2.5">
            <li v-for="factor in selectedRoute.factors" :key="factor.key">
              <div class="flex items-center justify-between text-[11px]">
                <span class="text-gray-300">{{ factor.label }}</span>
                <span v-if="factor.value !== null" :key="factor.value" class="font-mono font-semibold text-white t-num-pop">{{ factor.value }}</span>
              </div>
              <div class="mt-1 h-1.5 rounded-full bg-[#343740] overflow-hidden">
                <div
                  v-if="factor.value !== null"
                  class="h-full rounded-full bg-white transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                  :style="{ width: factor.value + '%' }"
                ></div>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <!-- Best Route Summary Card -->
      <div class="bg-[#1D1F24] rounded-[20px] p-4 border border-[#343740] flex flex-col justify-between text-white">
        <div class="flex justify-between items-start gap-3">
          <div>
            <p class="text-xs font-semibold text-white">Best Route</p>
            <p v-if="bestRoute" class="text-[11px] text-gray-400">
              Estimated time : {{ bestRoute.durationMin }} mins
            </p>
          </div>
          <button
            v-if="bestRoute"
            type="button"
            @click="emit('view-best-route', bestRoute)"
            class="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:bg-gray-200 transition-colors cursor-pointer"
          >
            <ArrowRight class="w-4 h-4" />
          </button>
        </div>

        <div class="mt-4 space-y-2 text-xs">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-white shrink-0"></span>
            <p class="font-medium text-white">{{ sourceQuery || origin }}</p>
          </div>
          <div class="flex items-center gap-2 text-gray-400">
            <span class="w-2 h-2 rounded-full border border-gray-400 shrink-0"></span>
            <p>{{ destQuery || destination }}</p>
          </div>
        </div>

        <div v-if="bestRoute" class="mt-4 pt-3 border-t border-[#343740] flex items-end justify-between gap-3">
          <div>
            <p class="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Distance</p>
            <p class="text-2xl font-bold text-white">{{ bestRoute.distanceKm }} KM</p>
          </div>
          <div class="text-right">
            <p class="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Est. safety</p>
            <p class="text-2xl font-bold text-white">
              <span
                :key="bestRoute.safety"
                :class="['t-num-pop inline-block transition-colors duration-300', getScoreColorClass(bestRoute.safety)]"
              >{{ bestRoute.safety }}</span>
              <span class="text-xs font-normal text-gray-400">/100</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>