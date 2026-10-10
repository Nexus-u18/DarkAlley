import { ref, computed, watchEffect } from 'vue';

/*
 * Theme preference: 'dark' | 'light' | 'system'.
 *
 * The resolved theme ('dark' or 'light') is written to <html data-theme="...">.
 * The Light colours live in style.css under html[data-theme='light'].
 * The choice is saved in this browser's localStorage. Default is 'dark'.
 */

const STORAGE_KEY = 'darkalley:theme';
const VALID = ['dark', 'light', 'system'];

const readSaved = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return VALID.includes(saved) ? saved : 'dark';
  } catch {
    return 'dark';
  }
};

export const themePreference = ref(readSaved());

// Follow the device setting live while 'system' is selected.
const media = window.matchMedia('(prefers-color-scheme: dark)');
const systemIsDark = ref(media.matches);
media.addEventListener('change', (e) => {
  systemIsDark.value = e.matches;
});

export const resolvedTheme = computed(() => {
  if (themePreference.value === 'system') return systemIsDark.value ? 'dark' : 'light';
  return themePreference.value;
});

// Runs once on import (before the app mounts) and again whenever the theme changes.
watchEffect(() => {
  const root = document.documentElement;
  root.dataset.theme = resolvedTheme.value;
  root.style.colorScheme = resolvedTheme.value; // native scrollbars and form controls follow
});

export const setTheme = (value) => {
  if (!VALID.includes(value)) return;
  themePreference.value = value;
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* storage blocked: the choice still applies until the page is closed */
  }
};