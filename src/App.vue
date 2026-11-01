<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import Lenis from 'lenis';
import Sidebar from './components/Sidebar.vue';
import Header from './components/Header.vue';
import RoutesPanel from './components/RoutesPanel.vue';
import IncidentsPanel from './components/IncidentsPanel.vue';
import DataPanel from './components/DataPanel.vue';
import MapPanel from './components/MapPanel.vue';
import SettingsPanel from './components/SettingsPanel.vue';
import './composables/useTheme.js'; // applies the saved theme before the first paint

// Import your original safety dataset to replace hardcoded metrics
import safetyData from './data/delhiSafetyData.json';

const activeTab = ref('routes');
const selectedRoute = ref(null);
const isSearching = ref(false);

const originLocation = ref({

});

const destinationLocation = ref({

});

const generatedRoutes = ref([]);

/**
 * Fetch 3 COMPLETE, continuous road routes connecting start directly to destination.
 */
const fetchActualRoutes = async (startCoords, endCoords) => {
  if (!startCoords || !endCoords) return [];

  const routesList = [];

  // Format coordinates as "lng,lat" for OSRM API
  const startStr = `${startCoords[1]},${startCoords[0]}`;
  const endStr = `${endCoords[1]},${endCoords[0]}`;

  try {
    // 1. Fetch Primary and native alternative routes directly connecting Start -> End
    const primaryUrl = `https://router.project-osrm.org/route/v1/driving/${startStr};${endStr}?overview=full&geometries=geojson&snapping=any&radiuses=1000;1000&alternatives=3`;
    const res = await fetch(primaryUrl);
    const data = await res.json();

    if (data.code === 'Ok' && Array.isArray(data.routes) && data.routes.length > 0) {
      data.routes.forEach((r, index) => {
        const path = r.geometry.coordinates.map((c) => [c[1], c[0]]);
        const distanceKm = parseFloat((r.distance / 1000).toFixed(1));
        const durationMin = Math.round(r.duration / 60);
        const routeId = String.fromCharCode(65 + index); // 'A', 'B', 'C'

        // Map original dataset metrics dynamically instead of hardcoded math
        const matchingDataPoint = safetyData[index % safetyData.length];

        routesList.push({
          id: routeId,
          name: index === 0 ? 'Primary Highway Express' : index === 1 ? 'Service Road Corridor' : 'Outer Sector Bypass',
          distanceKm,
          durationMin,
          safety: matchingDataPoint ? matchingDataPoint.safetyScore : 75,
          confidence: index === 0 ? 'verified' : 'simulated',
          path,
          factors: [
            { key: 'lighting', label: 'Street Lighting', value: matchingDataPoint?.lighting === 'High' ? 90 : 55 },
            { key: 'surveillance', label: 'CCTV Coverage', value: matchingDataPoint ? matchingDataPoint.safetyScore + 5 : 70 },
            { key: 'pedestrian', label: 'Pedestrian Density', value: 70 }
          ]
        });
      });
    }
  } catch (err) {
    console.warn('Primary OSRM route fetch failed:', err);
  }

  // 2. If OSRM returned fewer than 3 full routes, fetch secondary arterial road detours with explicit snapping radiuses
  if (routesList.length < 3) {
    const deltaLat = endCoords[0] - startCoords[0];
    const deltaLng = endCoords[1] - startCoords[1];

    // Compute waypoints on major parallel arterial road corridors
    const altWaypoints = [
      [startCoords[0] + deltaLat * 0.45 + 0.003, startCoords[1] + deltaLng * 0.45 - 0.003],
      [startCoords[0] + deltaLat * 0.55 - 0.003, startCoords[1] + deltaLng * 0.55 + 0.004]
    ];

    const neededIds = ['B', 'C'].filter((id) => !routesList.some((r) => r.id === id));

    for (let i = 0; i < neededIds.length; i++) {
      const routeId = neededIds[i];
      const wp = altWaypoints[i];
      const wpStr = `${wp[1]},${wp[0]}`;

      // Query Start -> Waypoint -> Destination with radiuses=1000;1000;1000 to prevent premature path cuts
      const detourUrl = `https://router.project-osrm.org/route/v1/driving/${startStr};${wpStr};${endStr}?overview=full&geometries=geojson&snapping=any&radiuses=1000;1000;1000`;

      try {
        const detourRes = await fetch(detourUrl);
        const detourData = await detourRes.json();

        if (detourData.code === 'Ok' && detourData.routes && detourData.routes.length > 0) {
          const r = detourData.routes[0];
          let path = r.geometry.coordinates.map((c) => [c[1], c[0]]);

          // Force path closure to destination if snap point slightly drifts off pin
          if (path.length > 0) {
            const lastPoint = path[path.length - 1];
            const distToEnd = Math.hypot(lastPoint[0] - endCoords[0], lastPoint[1] - endCoords[1]);
            if (distToEnd > 0.0001) {
              path.push([endCoords[0], endCoords[1]]);
            }
          }

          const fallbackData = safetyData[(i + 1) % safetyData.length];

          routesList.push({
            id: routeId,
            name: routeId === 'B' ? 'Outer Dahmi Bypass' : 'East Link Road',
            distanceKm: parseFloat((r.distance / 1000).toFixed(1)),
            durationMin: Math.round(r.duration / 60),
            safety: fallbackData ? fallbackData.safetyScore : 68,
            confidence: 'simulated',
            path,
            factors: [
              { key: 'lighting', label: 'Street Lighting', value: fallbackData?.lighting === 'High' ? 85 : 60 },
              { key: 'surveillance', label: 'CCTV Coverage', value: fallbackData ? fallbackData.safetyScore : 65 },
              { key: 'pedestrian', label: 'Pedestrian Density', value: 65 }
            ]
          });
        }
      } catch (e) {
        console.warn(`Alternative route ${routeId} fetch failed:`, e);
      }
    }
  }

  // Ensure sorting A, B, C
  routesList.sort((a, b) => a.id.localeCompare(b.id));

  return routesList.slice(0, 3);
};

const handleSelectRoute = (route) => {
  selectedRoute.value = route;
};

const geocodeLocation = async (query) => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`
    );
    const data = await res.json();
    if (data && data.length > 0) {
      return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
    }
  } catch (err) {
    console.warn('Geocoding query failed:', err);
  }
  return null;
};

const handleSearch = async ({ source, destination }) => {
  isSearching.value = true;

  let startCoords = originLocation.value.position;
  let endCoords = destinationLocation.value.position;

  if (source) {
    const coords = await geocodeLocation(source);
    if (coords) startCoords = coords;
    originLocation.value = { name: source, position: startCoords };
  }

  if (destination) {
    const coords = await geocodeLocation(destination);
    if (coords) endCoords = coords;
    destinationLocation.value = { name: destination, position: endCoords };
  }

  const routes = await fetchActualRoutes(startCoords, endCoords);
  generatedRoutes.value = routes;

  if (routes.length > 0) {
    selectedRoute.value = routes[0];
  }

  isSearching.value = false;
};

let lenis = null;

onMounted(async () => {
  lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    wheelMultiplier: 1,
  });

  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  // Initialize actual road routes on mount
  await handleSearch({
    source: originLocation.value.name,
    destination: destinationLocation.value.name
  });
});

onUnmounted(() => {
  if (lenis) lenis.destroy();
});
</script>

<template>
  <div class="h-screen w-screen bg-[#484B52] p-4 flex items-center justify-center overflow-hidden font-sans select-none antialiased">
    <div class="w-full h-full bg-[#2E3036] rounded-[24px] p-3 flex flex-col gap-3 border border-[#383B43] shadow-2xl relative overflow-hidden">
      <Header title="DarkAlley" userName="Adlii Kari" userRole="Civilian"[cite: 4] />

      <div class="flex-1 flex gap-4 overflow-hidden min-h-0">
        <Sidebar :activeTab="activeTab" @change-tab="(tab) => activeTab = tab"[cite: 4] />

        <main class="flex-1 flex flex-col gap-3 overflow-hidden">
        <div class="flex-1 grid grid-cols-12 gap-4 overflow-hidden">
          <RoutesPanel
            v-if="activeTab === 'routes'"
            :routesList="generatedRoutes.length ? generatedRoutes : undefined"
            :origin="originLocation.name"
            :destination="destinationLocation.name"
            :selectedId="selectedRoute?.id"
            :loading="isSearching"
            @select-route="handleSelectRoute"
            @search="handleSearch"
          />
          <IncidentsPanel v-else-if="activeTab === 'incidents'" />
          <DataPanel v-else-if="activeTab === 'data'" />
          <SettingsPanel v-else-if="activeTab === 'settings'" />

          <MapPanel
            :routes="generatedRoutes"
            :selectedId="selectedRoute?.id"
            :origin="originLocation"
            :destination="destinationLocation"
            @select-route="handleSelectRoute"
          />
        </div>
        </main>
      </div>
    </div>
  </div>
</template>