<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { Bell, User, ChevronRight, ArrowLeft, MapPin, Route } from 'lucide-vue-next';
import logo from '../assets/logo.png';

defineProps({
  title: {
    type: String,
    default: 'DarkAlley'
  },
  userName: {
    type: String,
    default: 'Adlii Kari'
  },
  userRole: {
    type: String,
    default: 'Civilian'
  },
  notificationCount: {
    type: Number,
    default: 0
  }
});

const emit = defineEmits(['notifications-click', 'profile-click']);

/* Profile dropdown */
const menuOpen = ref(false);
const menuView = ref('menu'); // 'menu' | 'profile'
const menuRef = ref(null);

const profileDetails = {
  email: 'adlii.kari@darkalley.demo',
  team: 'Route Operations',
  workArea: 'Jaipur, Rajasthan',
  routesReviewed: '28 this month'
};

const toggleMenu = () => {
  menuOpen.value = !menuOpen.value;
  if (menuOpen.value) menuView.value = 'menu';
};

const onYourProfile = () => {
  emit('profile-click');
  menuView.value = 'profile';
};

const onDocClick = (e) => {
  if (menuOpen.value && menuRef.value && !menuRef.value.contains(e.target)) {
    menuOpen.value = false;
  }
};

const onKeydown = (e) => {
  if (e.key === 'Escape') menuOpen.value = false;
};

onMounted(() => {
  document.addEventListener('mousedown', onDocClick);
  document.addEventListener('keydown', onKeydown);
});

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDocClick);
  document.removeEventListener('keydown', onKeydown);
});
</script>

<template>
  <!-- pt-1 matches the sidebar inner top padding alignment -->
  <header class="h-11 flex items-center justify-between px-1 shrink-0 pt-1">
    <!-- Logo + Title -->
    <div class="flex items-center gap-4">
      <img :src="logo" alt="DarkAlley logo" class="w-11 h-11 shrink-0 object-contain" />
      <h1 class="text-2xl font-bold tracking-tight text-white/90 leading-none">
        {{ title }}
      </h1>
    </div>

    <!-- User & Notification Actions -->
    <div class="flex items-center gap-3">
      <!-- Bell Notification Icon -->
      <button
        type="button"
        aria-label="Notifications"
        @click="emit('notifications-click')"
        class="relative w-10 h-10 bg-[#1D1F24] rounded-full border border-[#343740] flex items-center justify-center text-gray-300 hover:bg-[#2B2D34] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#2E3036]"
      >
        <Bell class="w-4 h-4" />
        <template v-if="notificationCount > 0">
          <span
            class="absolute top-2 right-2.5 w-2.5 h-2.5 bg-white rounded-full border-2 border-[#1D1F24]"
            aria-hidden="true"
          ></span>
          <span class="sr-only">{{ notificationCount }} unread</span>
        </template>
      </button>

      <!-- Profile Pill + Dropdown -->
      <div ref="menuRef" class="relative">
        <button
          type="button"
          aria-haspopup="menu"
          :aria-expanded="menuOpen"
          @click="toggleMenu"
          class="flex items-center gap-3 bg-[#1D1F24] pl-1.5 pr-4 py-1 rounded-full border border-[#343740] hover:bg-[#2B2D34] transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#2E3036]"
        >
          <!-- Profile Avatar Circle -->
          <div class="w-7 h-7 rounded-full bg-[#343740] border border-[#484B52] flex items-center justify-center">
            <User class="w-3.5 h-3.5 text-gray-300" />
          </div>
          <!-- User Info Text -->
          <div class="text-left leading-tight">
            <p class="font-semibold text-xs text-white">{{ userName }}</p>
            <p class="text-gray-400 text-[10px]">{{ userRole }}</p>
          </div>
        </button>

        <Transition
          enter-active-class="transition duration-150 ease-out"
          enter-from-class="opacity-0 -translate-y-1"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition duration-100 ease-in"
          leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 -translate-y-1"
        >
          <div
            v-if="menuOpen"
            role="menu"
            aria-label="Profile and preferences"
            class="absolute right-0 top-full mt-3 w-[340px] bg-[#1D1F24] border border-[#343740] rounded-2xl shadow-2xl p-5 z-50"
          >
            <div v-if="menuView === 'menu'">
                <p class="text-[10px] tracking-[0.2em] uppercase text-gray-500 mb-4">Profile &amp; Preferences</p>

                <div class="flex items-center gap-4">
                  <div class="relative w-14 h-14 shrink-0">
                    <div class="w-14 h-14 rounded-full bg-[#2B2D34] border border-[#343740] flex items-center justify-center">
                      <User class="w-6 h-6 text-gray-300" />
                    </div>
                    <span
                      class="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#1D1F24]"
                      aria-label="Online"
                    ></span>
                  </div>
                  <div class="leading-tight min-w-0">
                    <p class="text-lg font-semibold text-white truncate">{{ userName }}</p>
                    <p class="text-sm text-gray-400">{{ userRole }}</p>
                  </div>
                </div>

                <div class="h-px bg-[#343740] my-4"></div>

                <button
                  type="button"
                  role="menuitem"
                  @click="onYourProfile"
                  class="w-full flex items-center justify-between px-2 py-2.5 rounded-xl text-sm font-medium text-white hover:bg-[#2B2D34] transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <span>Your Profile</span>
                  <ChevronRight class="w-4 h-4 text-gray-400" />
                </button>
            </div>

            <div v-else>
              <button
                type="button"
                @click="menuView = 'menu'"
                class="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-md"
              >
                <ArrowLeft class="w-4 h-4" />
                <span>Back</span>
              </button>

              <div class="flex items-center gap-4 mt-5">
                <div class="w-14 h-14 shrink-0 rounded-full bg-[#2B2D34] border border-[#343740] flex items-center justify-center">
                  <User class="w-6 h-6 text-gray-300" />
                </div>
                <div class="leading-tight min-w-0">
                  <p class="text-lg font-semibold text-white truncate">{{ userName }}</p>
                  <p class="text-sm text-gray-400">{{ userRole }}</p>
                </div>
              </div>

              <dl class="mt-5 rounded-2xl border border-[#343740] px-4 text-sm">
                <div class="py-3 border-b border-[#343740]">
                  <dt class="text-[11px] tracking-[0.15em] uppercase text-gray-500">Email</dt>
                  <dd class="mt-1.5 text-white break-all">{{ profileDetails.email }}</dd>
                </div>
                <div class="py-3 border-b border-[#343740]">
                  <dt class="text-[11px] tracking-[0.15em] uppercase text-gray-500">Team</dt>
                  <dd class="mt-1.5 text-white">{{ profileDetails.team }}</dd>
                </div>
                <div class="py-3 border-b border-[#343740]">
                  <dt class="text-[11px] tracking-[0.15em] uppercase text-gray-500">Work area</dt>
                  <dd class="mt-1.5 flex items-center gap-2 text-white">
                    <MapPin class="w-4 h-4 text-emerald-400" />
                    <span>{{ profileDetails.workArea }}</span>
                  </dd>
                </div>
                <div class="py-3">
                  <dt class="text-[11px] tracking-[0.15em] uppercase text-gray-500">Routes reviewed</dt>
                  <dd class="mt-1.5 flex items-center gap-2 text-white">
                    <Route class="w-4 h-4 text-emerald-400" />
                    <span>{{ profileDetails.routesReviewed }}</span>
                  </dd>
                </div>
              </dl>

              <p class="mt-4 text-xs leading-relaxed text-gray-500">
                Sample profile details for the DarkAlley demo. No account data is connected.
              </p>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </header>
</template>