<script setup>
import { ref, onMounted, watch, nextTick } from 'vue';
import {
  LayoutGrid, Box, BarChart3,
  Settings, Bot
} from 'lucide-vue-next';
import ChatbotPanel from './ChatbotPanel.vue';

const props = defineProps({
  activeTab: {
    type: String,
    default: 'routes'
  }
});

const emit = defineEmits(['change-tab', 'report-filed']);

const navRef = ref(null);
const itemRefs = ref({});
const utilRefs = ref({});

/* Help button opens the safety assistant instead of switching tabs */
const chatOpen = ref(false);

watch(chatOpen, async (isOpen, wasOpen) => {
  if (wasOpen && !isOpen) {
    await nextTick();
    utilRefs.value.help?.focus(); // return focus to the "?" button when the chat closes
  }
});

const onUtilityClick = (id) => {
  if (id === 'help') {
    chatOpen.value = !chatOpen.value;
  } else {
    setActive(id);
  }
};

const isUtilityActive = (id) => (id === 'help' ? chatOpen.value : props.activeTab === id);

const mainNav = [
  { id: 'routes', label: 'Main', icon: LayoutGrid },
  { id: 'incidents', label: 'Activity', icon: Box },
  { id: 'data', label: 'Data', icon: BarChart3 }
];

const utilityNav = [
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'help', label: 'Chatbot', icon: Bot }
];

const pillTop = ref(0);
const isReady = ref(false);

const updatePillPosition = () => {
  const activeEl = itemRefs.value[props.activeTab];
  const navEl = navRef.value;
  
  if (activeEl && navEl) {
    const navRect = navEl.getBoundingClientRect();
    const activeRect = activeEl.getBoundingClientRect();
    pillTop.value = activeRect.top - navRect.top;
    isReady.value = true;
  }
};

const setActive = (tabName) => {
  emit('change-tab', tabName);
};

watch(() => props.activeTab, async () => {
  await nextTick();
  updatePillPosition();
});

onMounted(() => {
  updatePillPosition();
  window.addEventListener('resize', updatePillPosition);
});
</script>

<template>
  <aside class="w-16 bg-[#1D1F24] rounded-[20px] flex flex-col items-center justify-between py-4 border border-[#343740] shrink-0 relative select-none">
    <!-- Top Navigation Group -->
    <div class="flex flex-col items-center gap-5 w-full">
      <nav ref="navRef" aria-label="Primary" class="w-full flex flex-col items-center gap-[18px] relative">
        <div
          v-show="isReady"
          class="absolute left-1/2 w-10 h-10 rounded-full bg-white shadow-md pointer-events-none transition-transform duration-300 ease-[cubic-bezier(0.2,0,0,1)] z-0"
          :style="{ transform: `translate(-50%, ${pillTop}px)` }"
        ></div>

        <button
          v-for="item in mainNav"
          :key="item.id"
          :ref="(el) => { if (el) itemRefs[item.id] = el }"
          type="button"
          :title="item.label"
          :aria-label="item.label"
          :aria-current="activeTab === item.id ? 'page' : undefined"
          @click="setActive(item.id)"
          class="group flex flex-col items-center gap-1 focus-visible:outline-none cursor-pointer z-10 w-10"
        >
          <div class="w-10 h-10 flex items-center justify-center">
            <component
              :is="item.icon"
              :class="[
                'w-5 h-5 transition-colors duration-200',
                activeTab === item.id ? 'text-black' : 'text-gray-400 group-hover:text-white'
              ]"
            />
          </div>

          <span
            :class="[
              'text-[9px] leading-none transition-colors duration-200',
              activeTab === item.id ? 'text-white font-semibold' : 'text-gray-400 group-hover:text-gray-200'
            ]"
          >{{ item.label }}</span>
        </button>
      </nav>
    </div>

    <!-- Bottom Action Group -->
    <div class="flex flex-col items-center gap-3">
      <button
        v-for="item in utilityNav"
        :key="item.id"
        :ref="(el) => { if (el) utilRefs[item.id] = el }"
        type="button"
        :title="item.id === 'help' ? 'Safety assistant' : item.label"
        :aria-label="item.id === 'help' ? 'Safety assistant: report a problem or call for help' : item.label"
        :aria-current="item.id !== 'help' && activeTab === item.id ? 'page' : undefined"
        :aria-haspopup="item.id === 'help' ? 'dialog' : undefined"
        :aria-expanded="item.id === 'help' ? chatOpen : undefined"
        @click="onUtilityClick(item.id)"
        class="group focus-visible:outline-none cursor-pointer"
      >
        <span
          :class="[
            'w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-200',
            isUtilityActive(item.id) ? 'bg-white text-black' : 'text-gray-400 group-hover:text-white group-hover:bg-[#2B2D34]'
          ]"
        >
          <component :is="item.icon" class="w-5 h-5" />
        </span>
      </button>
    </div>

    <ChatbotPanel v-model:open="chatOpen" @report-filed="(report) => emit('report-filed', report)" />
  </aside>
</template>