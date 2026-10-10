<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import Lenis from 'lenis';
import { Database, ShieldCheck, Cpu, Radio, BarChart3 } from 'lucide-vue-next';

const scrollContainer = ref(null);
let lenis = null;
let animationFrameId = null;

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

const metrics = [
  { label: 'Active Telemetry Nodes', value: '142', unit: 'Sensors', icon: Cpu },
  { label: 'Update Cadence', value: '5s', unit: 'Interval', icon: Radio },
  { label: 'Map Provider', value: 'OSM', unit: 'Tiles', icon: Database },
  { label: 'Model Confidence', value: '94.2%', unit: 'Accuracy', icon: ShieldCheck }
];
</script>

<template>
  <section ref="scrollContainer" class="col-span-4 flex flex-col gap-4 overflow-y-auto pr-1 h-full">
    <div class="flex flex-col gap-4">
      <div class="bg-[#1D1F24] rounded-[20px] p-4 border border-[#343740] flex flex-col gap-4 text-white">
        <div class="flex items-center justify-between">
          <h2 class="font-semibold text-sm text-white flex items-center gap-2">
            Data Metrics
            <BarChart3 class="w-4 h-4 text-gray-400" />
          </h2>
          <span class="text-[11px] text-gray-400">System Telemetry</span>
        </div>

        <div class="grid grid-cols-2 gap-2.5">
          <div
            v-for="m in metrics"
            :key="m.label"
            class="p-3 rounded-xl border border-[#343740] bg-[#18191C] flex flex-col justify-between gap-2"
          >
            <div class="flex items-center justify-between text-gray-400">
              <span class="text-[10px] uppercase font-semibold tracking-wider">{{ m.label }}</span>
              <component :is="m.icon" class="w-3.5 h-3.5" />
            </div>
            <div>
              <p class="text-xl font-bold text-white">{{ m.value }}</p>
              <p class="text-[10px] text-gray-400">{{ m.unit }}</p>
            </div>
          </div>
        </div>

        <div class="p-3 rounded-xl border border-[#343740] bg-[#18191C] text-xs space-y-2">
          <p class="font-semibold text-white">Safety Index Engine</p>
          <p class="text-gray-400 text-[11px] leading-relaxed">
            Real-time calculations incorporate street illumination density, historical accident data, live pedestrian traffic estimates, and road conditions.
          </p>
        </div>
      </div>
    </div>
  </section>
</template>