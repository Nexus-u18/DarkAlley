<script setup>
import { computed } from 'vue';
import { Check } from 'lucide-vue-next';
import { themePreference, resolvedTheme, setTheme } from '../composables/useTheme.js';

// Preview colours are inline styles on purpose: they must show each theme as it is,
// whichever theme is active right now.
const DARK = { shell: '#2E3036', card: '#1D1F24', line: '#484B52' };
const LIGHT = { shell: '#EEF0F4', card: '#FFFFFF', line: '#C3C7D0' };

const OPTIONS = [
  { value: 'dark', label: 'Dark', hint: 'Dim colours, easier at night', panes: [DARK] },
  { value: 'light', label: 'Light', hint: 'Bright colours for daytime', panes: [LIGHT] },
  { value: 'system', label: 'Match device', hint: 'Follows your device setting', panes: [DARK, LIGHT] }
];

const preference = computed({
  get: () => themePreference.value,
  set: (value) => setTheme(value)
});

const statusText = computed(() =>
  themePreference.value === 'system'
    ? `Following your device, which is set to ${resolvedTheme.value} right now.`
    : `Using the ${themePreference.value} theme.`
);
</script>

<template>
  <section class="col-span-4 flex flex-col gap-4 overflow-y-auto pr-1 h-full" aria-labelledby="settings-title">
    <div class="bg-[#1D1F24] rounded-[20px] p-4 border border-[#343740] flex flex-col gap-4 text-white">
      <h2 id="settings-title" class="font-semibold text-sm text-white">Settings</h2>

      <fieldset class="flex flex-col gap-3">
        <legend class="text-xs font-semibold text-white">Theme</legend>
        <p class="text-[11px] leading-snug text-gray-400">
          Choose how DarkAlley looks. Your choice is saved on this device.
        </p>

        <div class="flex flex-col gap-2">
          <label
            v-for="opt in OPTIONS"
            :key="opt.value"
            :class="[
              'flex items-center gap-3 rounded-2xl border p-3 cursor-pointer transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-white',
              preference === opt.value
                ? 'border-white bg-[#2B2D34]'
                : 'border-[#343740] bg-[#18191C] hover:bg-[#2B2D34]'
            ]"
          >
            <input
              v-model="preference"
              type="radio"
              name="theme"
              :value="opt.value"
              class="sr-only"
            />

            <span
              class="flex h-11 w-16 shrink-0 overflow-hidden rounded-lg border border-[#484B52]"
              aria-hidden="true"
            >
              <span
                v-for="(pane, i) in opt.panes"
                :key="i"
                class="relative flex-1"
                :style="{ background: pane.shell }"
              >
                <span
                  class="absolute inset-1.5 rounded-[4px]"
                  :style="{ background: pane.card, border: `1px solid ${pane.line}` }"
                ></span>
              </span>
            </span>

            <span class="min-w-0 flex-1">
              <span class="block text-xs font-semibold text-white">{{ opt.label }}</span>
              <span class="block text-[11px] text-gray-400">{{ opt.hint }}</span>
            </span>

            <Check
              v-if="preference === opt.value"
              class="h-4 w-4 shrink-0 text-white"
              aria-hidden="true"
            />
          </label>
        </div>

        <p class="text-[11px] text-gray-400" aria-live="polite">{{ statusText }}</p>
      </fieldset>
    </div>
  </section>
</template>