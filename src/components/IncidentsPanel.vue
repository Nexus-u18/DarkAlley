<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import Lenis from 'lenis';
import {
  AlertTriangle, EyeOff, Construction, ShieldAlert, Clock, MapPin,
  CheckCircle2, Filter, Shield, Activity
} from 'lucide-vue-next';

const props = defineProps({
  incidents: {
    type: Array,
    default: () => [
      {
        id: 1,
        title: 'Streetlight Outage',
        location: 'Sector 4, Main Road',
        routeId: 'A',
        time: '2 mins ago',
        severity: 'high',
        type: 'lighting',
        status: 'active',
        description: 'Multiple overhead LED units non-functional along a 200m stretch.'
      },
      {
        id: 2,
        title: 'Road Construction Hazard',
        location: 'Inner Lanes',
        routeId: 'B',
        time: '14 mins ago',
        severity: 'medium',
        type: 'roadwork',
        status: 'active',
        description: 'Unmarked excavation near alley intersection. Reduced lane width.'
      },
      {
        id: 3,
        title: 'CCTV Blindspot Detected',
        location: 'Bypass Underpass',
        routeId: 'C',
        time: '28 mins ago',
        severity: 'low',
        type: 'camera',
        status: 'investigating',
        description: 'Telemetry sync offline on camera node #104. Safety rating adjusted.'
      },
      {
        id: 4,
        title: 'Unusual Crowd Gathering',
        location: 'Market Street Exit',
        routeId: 'A',
        time: '45 mins ago',
        severity: 'medium',
        type: 'crowd',
        status: 'active',
        description: 'Elevated pedestrian density flagged by local sensor mesh.'
      }
    ]
  }
});

const emit = defineEmits(['focus-location', 'resolve-incident']);

const selectedSeverity = ref('all');
const scrollContainer = ref(null);
let lenis = null;
let animationFrameId = null;

// Lenis smooth scrolling setup
onMounted(() => {
  if (scrollContainer.value) {
    lenis = new Lenis({
      wrapper: scrollContainer.value,
      content: scrollContainer.value.firstElementChild,
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true
    });

    function raf(time) {
      lenis?.raf(time);
      animationFrameId = requestAnimationFrame(raf);
    }
    animationFrameId = requestAnimationFrame(raf);
  }
});

onUnmounted(() => {
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  if (lenis) lenis.destroy();
});

// Filtering logic
const filteredIncidents = computed(() => {
  if (selectedSeverity.value === 'all') return props.incidents;
  return props.incidents.filter((i) => i.severity === selectedSeverity.value);
});

// Summary Counters
const highCount = computed(() => props.incidents.filter((i) => i.severity === 'high').length);
const activeCount = computed(() => props.incidents.filter((i) => i.status === 'active').length);

const getSeverityBadgeClass = (sev) => {
  switch (sev) {
    case 'high':
      return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    case 'medium':
      return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    default:
      return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
  }
};

const getIncidentIcon = (type) => {
  switch (type) {
    case 'lighting': return EyeOff;
    case 'roadwork': return Construction;
    case 'camera': return ShieldAlert;
    default: return AlertTriangle;
  }
};
</script>

<template>
  <section ref="scrollContainer" class="col-span-4 flex flex-col gap-4 overflow-y-auto pr-1 h-full">
    <div class="flex flex-col gap-3">
      <!-- Container Box -->
      <div class="bg-[#1D1F24] rounded-[20px] p-4 border border-[#343740] flex flex-col gap-4 text-white">
        
        <!-- Header -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <h2 class="font-semibold text-sm text-white">Incidents</h2>
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <span class="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse"></span>
              Live Feed
            </span>
          </div>
          <span class="text-[11px] text-gray-400 font-medium">{{ incidents.length }} Logged</span>
        </div>

        <!-- Metric Summary Chips -->
        <div class="grid grid-cols-3 gap-2">
          <div class="bg-[#18191C] border border-[#343740] rounded-xl p-2.5 flex flex-col items-center justify-center">
            <span class="text-[10px] text-gray-400 uppercase font-semibold">Active</span>
            <span class="text-base font-bold text-white mt-0.5">{{ activeCount }}</span>
          </div>
          <div class="bg-[#18191C] border border-[#343740] rounded-xl p-2.5 flex flex-col items-center justify-center">
            <span class="text-[10px] text-rose-400 uppercase font-semibold">Critical</span>
            <span class="text-base font-bold text-rose-400 mt-0.5">{{ highCount }}</span>
          </div>
          <div class="bg-[#18191C] border border-[#343740] rounded-xl p-2.5 flex flex-col items-center justify-center">
            <span class="text-[10px] text-emerald-400 uppercase font-semibold">Sensors</span>
            <span class="text-base font-bold text-emerald-400 mt-0.5">100%</span>
          </div>
        </div>

        <!-- Severity Filter Bar -->
        <div class="flex items-center justify-between border-b border-[#343740] pb-3">
          <span class="text-[11px] text-gray-400 flex items-center gap-1">
            <Filter class="w-3 h-3 text-gray-400" />
            Filter Severity
          </span>
          <div class="flex items-center gap-1.5">
            <button
              v-for="sev in ['all', 'high', 'medium', 'low']"
              :key="sev"
              type="button"
              @click="selectedSeverity = sev"
              :class="[
                'px-2.5 py-1 rounded-lg text-[10px] font-semibold capitalize transition-colors cursor-pointer',
                selectedSeverity === sev
                  ? 'bg-white text-black'
                  : 'bg-[#282A30] text-gray-400 hover:text-white'
              ]"
            >
              {{ sev }}
            </button>
          </div>
        </div>

        <!-- Incident Cards List -->
        <ul class="flex flex-col gap-2.5">
          <li
            v-for="inc in filteredIncidents"
            :key="inc.id"
            class="p-3.5 rounded-xl border border-[#343740] bg-[#18191C] hover:bg-[#23252B] transition-all flex flex-col gap-2.5 group"
          >
            <!-- Card Header -->
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2 min-w-0">
                <div class="w-7 h-7 rounded-lg bg-[#282A30] border border-[#343740] flex items-center justify-center shrink-0 text-white">
                  <component :is="getIncidentIcon(inc.type)" class="w-3.5 h-3.5" />
                </div>
                <h3 class="text-xs font-semibold text-white truncate">{{ inc.title }}</h3>
              </div>

              <div class="flex items-center gap-1.5 shrink-0">
                <!-- Route Indicator Tag -->
                <span class="px-1.5 py-0.5 rounded bg-[#282A30] border border-[#343740] text-[9px] font-mono font-bold text-gray-300">
                  Route {{ inc.routeId }}
                </span>

                <!-- Severity Badge -->
                <span
                  :class="[
                    'px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider',
                    getSeverityBadgeClass(inc.severity)
                  ]"
                >
                  {{ inc.severity }}
                </span>
              </div>
            </div>

            <!-- Description -->
            <p class="text-[11px] text-gray-300 leading-snug">{{ inc.description }}</p>

            <!-- Card Footer -->
            <div class="flex items-center justify-between text-[10px] text-gray-400 pt-2 border-t border-[#2B2D34]">
              <span
                @click="emit('focus-location', inc)"
                class="flex items-center gap-1 truncate text-gray-300 hover:text-white cursor-pointer transition-colors"
              >
                <MapPin class="w-3 h-3 text-gray-400 shrink-0" />
                {{ inc.location }}
              </span>

              <div class="flex items-center gap-2 shrink-0">
                <span class="flex items-center gap-1 text-gray-400">
                  <Clock class="w-3 h-3 text-gray-400 shrink-0" />
                  {{ inc.time }}
                </span>

                <button
                  type="button"
                  @click="emit('resolve-incident', inc.id)"
                  title="Mark as resolved"
                  class="text-gray-500 hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  <CheckCircle2 class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>