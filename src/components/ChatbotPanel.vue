<script setup>
import { ref, reactive, computed, watch, nextTick, onBeforeUnmount } from 'vue';
import { LocateFixed, Loader2, MapPin, Phone, Send, X } from 'lucide-vue-next';
import { addReport } from '../data/Reports.js';

const props = defineProps({
  open: { type: Boolean, default: false }
});

const emit = defineEmits(['update:open', 'report-filed']);

const close = () => emit('update:open', false);

/* ---------- Constants ---------- */
// India's emergency numbers. 108 (ambulance) is run per state; it works in Rajasthan.
const EMERGENCY_NUMBERS = [
  { label: 'Police', number: '100' },
  { label: 'Ambulance', number: '108' },
  { label: "Women's helpline", number: '1091' }
];

const ANOMALY_TYPES = [
  'Poor lighting',
  'Harassment',
  'Suspicious activity',
  'Unsafe road',
  'Accident',
  'Other'
];

const WHEN_OPTIONS = ['Just now', 'Earlier today', 'Yesterday or earlier'];

// Typed messages that look like someone may be in danger bring up the call buttons.
const DANGER =
  /\b(help me|emergency|danger|attack(ed)?|assault(ed)?|follow(ing|ed) me|stalk(ing|ed)?|kidnap(ped)?|weapon|knife|gun|bleeding|unconscious|hurt|fire|threat(en|ening|ened)?|police|ambulance|rape|molest(ed)?)\b/i;

/* ---------- Conversation state ---------- */
const messages = ref([]);
const step = ref('menu'); // 'menu' | 'type' | 'location' | 'details' | 'when' | 'confirm' | 'done'
const input = ref('');
const draft = reactive({ type: '', location: null, description: '', when: '' });
const locating = ref(false);

const panelRef = ref(null);
const listRef = ref(null);
const inputRef = ref(null);

let uid = 0;
const push = (from, payload) => messages.value.push({ id: ++uid, from, ...payload });
const say = (text, extra = {}) => push('bot', { text, ...extra });
const hear = (text) => push('user', { text });

const showEmergency = (intro = 'If you are in danger, call now. Tap a number to open your phone\u2019s dialler.') => {
  const last = messages.value[messages.value.length - 1];
  if (last?.kind === 'emergency') {
    scrollToEnd();
    return;
  }
  say(intro, { kind: 'emergency' });
};

const greet = () => {
  step.value = 'menu';
  say('Hi, I can help you report a safety problem or call for help. What do you need?');
};

/* ---------- Report flow ---------- */
const startReport = () => {
  hear('File a report');
  Object.assign(draft, { type: '', location: null, description: '', when: '' });
  input.value = '';
  step.value = 'type';
  say('What kind of problem is it?');
};

const pickType = (type) => {
  hear(type);
  draft.type = type;
  step.value = 'location';
  say('Where did it happen? Search for a place, or use your current location.');
};

const setLocation = (location) => {
  draft.location = location;
  places.value = [];
  input.value = '';
  step.value = 'details';
  say('Describe what happened in a sentence or two, or skip this step.');
};

const useMyLocation = () => {
  if (locating.value) return;
  hear('Use my current location');
  if (!navigator.geolocation) {
    say('This browser can\u2019t share your location. Type a place instead.');
    return;
  }
  locating.value = true;
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      locating.value = false;
      setLocation({ label: 'Current location', pos: [pos.coords.latitude, pos.coords.longitude] });
    },
    () => {
      locating.value = false;
      say('I couldn\u2019t get your location. Allow location access in your browser, or type a place instead.');
    },
    { enableHighAccuracy: true, timeout: 8000 }
  );
};

const pickPlace = (place) => {
  hear(place.name);
  setLocation({
    label: [place.name, place.subtitle].filter(Boolean).join(', '),
    pos: [place.lat, place.lng]
  });
};

const askWhen = () => {
  input.value = '';
  step.value = 'when';
  say('When did this happen?');
};

const skipDetails = () => {
  hear('Skip');
  draft.description = '';
  askWhen();
};

const pickWhen = (when) => {
  hear(when);
  draft.when = when;
  step.value = 'confirm';
  say('Check your report before sending.', {
    kind: 'summary',
    summary: {
      Problem: draft.type,
      Location: draft.location?.label ?? '',
      Details: draft.description || 'No description',
      When: draft.when
    }
  });
};

const submitReport = () => {
  hear('Submit report');
  const report = addReport({
    type: draft.type,
    location: { ...draft.location },
    description: draft.description,
    when: draft.when
  });
  emit('report-filed', report);
  step.value = 'done';
  say(`Report ${report.id} is saved. Thank you for helping keep others safe.`);
  say('If anyone is in immediate danger, call now.', { kind: 'emergency' });
};

const cancelReport = () => {
  hear('Cancel');
  step.value = 'menu';
  say('Cancelled. Nothing was saved. What would you like to do?');
};

/* ---------- Typed input ---------- */
const send = () => {
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  hear(text);

  const inDanger = DANGER.test(text);
  if (inDanger) showEmergency('This sounds urgent. If you are in danger, call now.');

  if (step.value === 'location') {
    // Typed without picking a suggestion: keep the text, but there are no coordinates.
    setLocation({ label: text, pos: null });
  } else if (step.value === 'details') {
    draft.description = text;
    askWhen();
  } else if (step.value === 'menu' && !inDanger) {
    if (/\b(report|file|anomal\w*|issue|problem|incident)\b/i.test(text)) {
      messages.value.pop(); // startReport adds its own "File a report" line
      startReport();
    } else {
      say('I can file a safety report or help you call for help. Choose an option below.');
    }
  }
};

const inputEnabled = computed(() => ['menu', 'location', 'details'].includes(step.value));

const placeholder = computed(
  () =>
    ({
      menu: 'Type a message',
      location: 'Search for a place',
      details: 'Describe what happened'
    })[step.value] ?? 'Choose an option above'
);

/* ---------- Quick-reply buttons ---------- */
const chips = computed(() => {
  switch (step.value) {
    case 'menu':
      return [
        { label: 'File a report', run: startReport },
        { label: 'Emergency numbers', run: () => { hear('Emergency numbers'); showEmergency(); } }
      ];
    case 'type':
      return ANOMALY_TYPES.map((t) => ({ label: t, run: () => pickType(t) }));
    case 'location':
      return [{ label: 'Use my current location', icon: LocateFixed, run: useMyLocation }];
    case 'details':
      return [{ label: 'Skip', run: skipDetails }];
    case 'when':
      return WHEN_OPTIONS.map((w) => ({ label: w, run: () => pickWhen(w) }));
    case 'confirm':
      return [
        { label: 'Submit report', primary: true, run: submitReport },
        { label: 'Start over', run: startReport },
        { label: 'Cancel', run: cancelReport }
      ];
    case 'done':
      return [
        { label: 'File another report', run: startReport },
        { label: 'Emergency numbers', run: () => { hear('Emergency numbers'); showEmergency(); } }
      ];
    default:
      return [];
  }
});

/* ---------- Place suggestions (Photon geocoder, same as the Routes search) ---------- */
const GEOCODER_URL = 'https://photon.komoot.io/api/';
const GEO_BIAS = { lat: 26.9124, lon: 75.7873 };
const GEO_BBOX = '68.1,6.7,97.4,35.7'; // India. Set to '' to search worldwide.

const places = ref([]);
const placesStatus = ref('idle'); // 'idle' | 'loading' | 'done' | 'error'

const fetchPlaces = async (query, signal) => {
  const params = new URLSearchParams({
    q: query,
    limit: '4',
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
      return {
        id: `${p.osm_type}${p.osm_id}`,
        name,
        subtitle: [p.street, p.district || p.locality, p.city, p.state]
          .filter((part) => part && part !== name)
          .join(', '),
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

let searchTimer = null;
let searchController = null;

watch(input, (value) => {
  clearTimeout(searchTimer);
  searchController?.abort();

  const q = value.trim();
  if (step.value !== 'location' || q.length < 3) {
    places.value = [];
    placesStatus.value = 'idle';
    return;
  }

  placesStatus.value = 'loading';
  searchTimer = setTimeout(async () => {
    const mine = new AbortController();
    searchController = mine;
    try {
      places.value = await fetchPlaces(q, mine.signal);
      placesStatus.value = 'done';
    } catch (err) {
      if (err.name === 'AbortError') return;
      places.value = [];
      placesStatus.value = 'error';
    }
  }, 300);
});

onBeforeUnmount(() => {
  clearTimeout(searchTimer);
  searchController?.abort();
});

/* ---------- Scrolling and focus ---------- */
function scrollToEnd() {
  nextTick(() => {
    const el = listRef.value;
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollTo({ top: el.scrollHeight, behavior: reduce ? 'auto' : 'smooth' });
  });
}

watch(() => messages.value.length, scrollToEnd);

watch(step, async (value) => {
  if (value === 'location' || value === 'details') {
    await nextTick();
    inputRef.value?.focus();
  }
});

watch(
  () => props.open,
  async (isOpen) => {
    if (!isOpen) return;
    if (!messages.value.length) greet();
    await nextTick();
    panelRef.value?.focus();
    scrollToEnd();
  }
);
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out motion-reduce:transition-none"
      enter-from-class="opacity-0 translate-y-2"
      leave-active-class="transition duration-150 ease-in motion-reduce:transition-none"
      leave-to-class="opacity-0 translate-y-2"
    >
      <section
        v-if="open"
        ref="panelRef"
        role="dialog"
        aria-label="Safety assistant"
        tabindex="-1"
        @keydown.esc.stop="close"
        class="fixed bottom-4 left-[7.5rem] z-[2000] flex h-[34rem] max-h-[calc(100vh-2rem)] w-[22rem] flex-col overflow-hidden rounded-[20px] border border-[#343740] bg-[#1D1F24] text-white shadow-2xl shadow-black/60 outline-none max-sm:left-2 max-sm:right-2 max-sm:w-auto"
      >
        <!-- Header -->
        <header class="flex items-center justify-between gap-2 border-b border-[#343740] px-4 py-3">
          <div class="min-w-0">
            <h2 class="text-sm font-semibold">Safety assistant</h2>
            <p class="text-[11px] text-gray-400">Report a problem or call for help</p>
          </div>

          <div class="flex items-center gap-2">
            <button
              type="button"
              @click="showEmergency()"
              class="flex h-8 items-center gap-1.5 rounded-full bg-rose-600 px-3 text-xs font-semibold text-white transition-colors hover:bg-rose-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white cursor-pointer"
            >
              <Phone class="h-3.5 w-3.5" aria-hidden="true" />
              Emergency
            </button>
            <button
              type="button"
              aria-label="Close assistant"
              @click="close"
              class="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-[#2B2D34] hover:text-white focus-visible:outline-2 focus-visible:outline-white cursor-pointer"
            >
              <X class="h-4 w-4" />
            </button>
          </div>
        </header>

        <!-- Messages -->
        <div
          ref="listRef"
          role="log"
          aria-live="polite"
          class="flex flex-1 flex-col gap-2.5 overflow-y-auto px-4 py-3"
        >
          <template v-for="m in messages" :key="m.id">
            <!-- User bubble -->
            <p
              v-if="m.from === 'user'"
              class="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-white px-3 py-2 text-xs text-black"
            >{{ m.text }}</p>

            <!-- Emergency card -->
            <div
              v-else-if="m.kind === 'emergency'"
              class="max-w-[95%] rounded-2xl rounded-bl-md border border-rose-500/40 bg-rose-500/10 p-3"
            >
              <p class="text-xs font-semibold text-white">{{ m.text }}</p>

              <a
                href="tel:112"
                class="mt-2.5 flex h-11 items-center justify-center gap-2 rounded-xl bg-rose-600 text-sm font-bold text-white transition-colors hover:bg-rose-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <Phone class="h-4 w-4" aria-hidden="true" />
                Call 112
              </a>
              <p class="mt-1 text-center text-[11px] text-gray-300">National emergency number</p>

              <div class="mt-2.5 grid grid-cols-3 gap-2">
                <a
                  v-for="n in EMERGENCY_NUMBERS"
                  :key="n.number"
                  :href="`tel:${n.number}`"
                  class="rounded-xl border border-[#484B52] bg-[#18191C] px-2 py-2 text-center transition-colors hover:bg-[#2B2D34] focus-visible:outline-2 focus-visible:outline-white"
                >
                  <span class="block text-sm font-bold">{{ n.number }}</span>
                  <span class="block text-[10px] leading-tight text-gray-400">{{ n.label }}</span>
                </a>
              </div>

              <p class="mt-2.5 text-[11px] leading-snug text-gray-300">
                This opens your phone's dialler. On a computer, dial from your phone. DarkAlley can't contact emergency services for you.
              </p>
            </div>

            <!-- Report summary -->
            <div
              v-else-if="m.kind === 'summary'"
              class="max-w-[95%] rounded-2xl rounded-bl-md bg-[#282A30] px-3 py-2.5"
            >
              <p class="text-xs text-gray-100">{{ m.text }}</p>
              <dl class="mt-2 flex flex-col gap-1.5">
                <div v-for="(value, label) in m.summary" :key="label" class="flex gap-2 text-xs">
                  <dt class="w-16 shrink-0 text-gray-400">{{ label }}</dt>
                  <dd class="min-w-0 break-words text-white">{{ value }}</dd>
                </div>
              </dl>
            </div>

            <!-- Bot bubble -->
            <p
              v-else
              class="max-w-[85%] rounded-2xl rounded-bl-md bg-[#282A30] px-3 py-2 text-xs text-gray-100"
            >{{ m.text }}</p>
          </template>
        </div>

        <!-- Footer: place suggestions, quick replies, input -->
        <footer class="flex flex-col gap-2 border-t border-[#343740] p-3">
          <ul
            v-if="step === 'location' && (places.length || placesStatus !== 'idle')"
            aria-label="Place suggestions"
            class="overflow-hidden rounded-xl border border-[#343740] bg-[#18191C]"
          >
            <li
              v-for="p in places"
              :key="p.id"
            >
              <button
                type="button"
                @click="pickPlace(p)"
                class="flex w-full items-start gap-2.5 px-3 py-2 text-left transition-colors hover:bg-[#2B2D34] focus-visible:bg-[#2B2D34] focus-visible:outline-none cursor-pointer"
              >
                <MapPin class="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden="true" />
                <span class="min-w-0">
                  <span class="block truncate text-xs font-medium text-white">{{ p.name }}</span>
                  <span v-if="p.subtitle" class="block truncate text-[11px] text-gray-400">{{ p.subtitle }}</span>
                </span>
              </button>
            </li>
            <li
              v-if="placesStatus === 'loading' && !places.length"
              class="flex items-center gap-2 px-3 py-2 text-[11px] text-gray-400"
            >
              <Loader2 class="h-3 w-3 animate-spin" aria-hidden="true" />Searching…
            </li>
            <li v-else-if="placesStatus === 'error'" class="px-3 py-2 text-[11px] text-gray-400">
              Couldn't load suggestions. Press Enter to use what you typed.
            </li>
            <li v-else-if="placesStatus === 'done' && !places.length" class="px-3 py-2 text-[11px] text-gray-400">
              No places found. Press Enter to use what you typed.
            </li>
          </ul>

          <div v-if="chips.length" class="flex flex-wrap gap-2">
            <button
              v-for="chip in chips"
              :key="chip.label"
              type="button"
              :disabled="locating"
              @click="chip.run()"
              :class="[
                'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-white disabled:cursor-wait disabled:opacity-60 cursor-pointer',
                chip.primary
                  ? 'border-white bg-white text-black hover:bg-gray-200'
                  : 'border-[#343740] bg-[#18191C] text-white hover:bg-[#2B2D34]'
              ]"
            >
              <Loader2 v-if="chip.icon && locating" class="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              <component :is="chip.icon" v-else-if="chip.icon" class="h-3.5 w-3.5" aria-hidden="true" />
              {{ chip.label }}
            </button>
          </div>

          <form class="flex items-center gap-2" @submit.prevent="send">
            <label for="chat-input" class="sr-only">Message</label>
            <input
              id="chat-input"
              ref="inputRef"
              v-model="input"
              type="text"
              autocomplete="off"
              :disabled="!inputEnabled"
              :placeholder="placeholder"
              class="h-10 min-w-0 flex-1 rounded-xl border border-[#343740] bg-[#18191C] px-3 text-sm text-white outline-none transition-colors placeholder:text-gray-500 focus:border-white disabled:cursor-not-allowed disabled:opacity-60"
            />
            <button
              type="submit"
              aria-label="Send message"
              :disabled="!inputEnabled || !input.trim()"
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-black transition-colors hover:bg-gray-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:bg-[#484B52] disabled:text-gray-400 cursor-pointer"
            >
              <Send class="h-4 w-4" />
            </button>
          </form>
        </footer>
      </section>
    </Transition>
  </Teleport>
</template>