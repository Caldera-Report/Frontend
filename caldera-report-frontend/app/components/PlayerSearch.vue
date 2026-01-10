<template>
  <div class="relative w-full">
    <div ref="searchContainer" class="relative">
      <IconField class="w-full">
        <InputIcon class="pi pi-search text-zinc-400" />
        <InputText
          ref="searchField"
          v-model="search"
          autocomplete="off"
          placeholder="Search for a Guardian..."
          class="w-full pl-10 pr-10 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:border-zinc-600"
          @focus="openMenu"
          @keydown.down.prevent="move(1)"
          @keydown.up.prevent="move(-1)"
          @keydown.enter.prevent="onEnter"
          @keydown.esc="closeMenu"
        />
      </IconField>

      <i
        v-if="isPending"
        class="pi pi-spinner pi-spin absolute right-3 top-1/2 -translate-y-1/2 text-blue-400 text-sm"
      />

      <div
        v-if="menu"
        class="absolute left-0 right-0 mt-2 z-50"
        :style="{ width: dropdownWidth }"
      >
        <Card
          class="shadow-2xl border border-zinc-700 bg-zinc-800 backdrop-blur-lg rounded-lg overflow-hidden"
        >
          <template #content>
            <div
              v-if="hasAnyPlayers"
              class="max-h-80 overflow-y-auto custom-scrollbar"
            >
              <div
                class="sticky top-0 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-400 bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-700 flex items-center gap-2"
              >
                <i
                  :class="
                    showRecents && !search ? 'pi pi-history' : 'pi pi-search'
                  "
                  class="text-sm"
                />
                <span>
                  {{
                    showRecents && !search ? "Recent Players" : "Search Results"
                  }}
                </span>
              </div>

              <ul class="py-1">
                <li
                  v-for="(p, i) in showRecents && !search
                    ? recentPlayers
                    : allPlayers"
                  :key="p.id ?? i"
                  :class="[
                    'flex items-center justify-between px-4 py-3 cursor-pointer select-none transition-colors duration-150 mx-1.5 my-0.5 rounded-md',
                    i === activeIndex
                      ? 'bg-blue-600 text-white'
                      : 'hover:bg-zinc-700 text-zinc-100',
                  ]"
                  @mouseenter="activeIndex = i"
                  @click="onItemClick(p)"
                >
                  <div class="flex items-center gap-3">
                    <div
                      class="w-9 h-9 rounded-full overflow-hidden bg-zinc-700 shrink-0"
                    >
                      <img
                        v-if="p.lastPlayedCharacterEmblemPath"
                        :src="getEmblemUrl(p.lastPlayedCharacterEmblemPath)"
                        :alt="`${p.fullDisplayName ?? 'Player'} emblem`"
                        class="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div class="flex flex-col gap-1">
                      <span
                        class="font-medium text-sm"
                        v-html="highlight(p.fullDisplayName ?? '')"
                      />
                      <div
                        v-if="p.membershipType != null"
                        class="flex items-center gap-2"
                      >
                        <span
                          :class="[
                            'text-xs px-2 py-0.5 rounded font-medium',
                            i === activeIndex
                              ? 'bg-blue-700 text-blue-100'
                              : 'bg-zinc-700 text-zinc-300',
                          ]"
                        >
                          {{ getMembershipType(p.membershipType) }}
                        </span>
                      </div>
                    </div>
                  </div>
                  <i
                    class="pi pi-chevron-right text-xs"
                    :class="i === activeIndex ? 'text-white' : 'text-zinc-500'"
                  />
                </li>
              </ul>
            </div>

            <div v-else class="px-6 py-6 text-center">
              <div
                class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-zinc-700 mb-3"
              >
                <i v-if="!search" class="pi pi-search text-2xl text-zinc-400" />
                <i
                  v-else-if="isPending"
                  class="pi pi-spinner pi-spin text-2xl text-blue-400"
                />
                <i
                  v-else-if="errorMessage"
                  class="pi pi-exclamation-triangle text-2xl text-red-400"
                />
                <i v-else class="pi pi-info-circle text-2xl text-zinc-400" />
              </div>
              <p class="text-sm text-zinc-400 max-w-xs mx-auto">
                <span v-if="!search">
                  Start typing to search for players...
                </span>
                <span v-else-if="!isPending && !errorMessage">
                  No players found. Press
                  <kbd
                    class="px-1.5 py-0.5 bg-zinc-700 rounded text-xs font-mono"
                    >Enter</kbd
                  >
                  to search again.
                </span>
                <span v-else-if="errorMessage" class="text-red-400">
                  {{ errorMessage }}
                </span>
              </p>
            </div>
          </template>
        </Card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  onMounted,
  watch,
  nextTick,
  onBeforeUnmount,
  computed,
} from "vue";
import { api } from "../../api/internal/client";
import type { components } from "../../api/internal/openapi";
import type IconField from "primevue/iconfield";

function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

type PlayerSearchDto = components["schemas"]["PlayerSearchDto"];
type PlayerDto = components["schemas"]["PlayerDto"];

const router = useRouter();

const search = ref("");
const selectedPlayer = ref<PlayerSearchDto | null>(null);
const allPlayers = ref<PlayerSearchDto[]>([]);

const menu = ref(false);
const activeIndex = ref(-1);
const searchField = ref();
const searchContainer = ref<HTMLElement | null>(null);
const dropdownWidth = ref("360px");

const ENABLE_RECENTS = true;
const RECENT_LIMIT = 8;
const RECENTS_KEY = "recentPlayers";
const recentPlayers = ref<PlayerSearchDto[]>([]);

const playersData = ref<PlayerSearchDto[]>([]);
const isPending = ref(false);
const errorMessage = ref<string | null>(null);

async function searchPlayers(term: string) {
  const playerName = term.trim();
  if (!playerName) {
    playersData.value = [];
    allPlayers.value = [];
    return;
  }

  isPending.value = true;
  errorMessage.value = null;

  try {
    const res = await api.POST("/api/Players/search", {
      body: { playerName },
    });
    playersData.value = res.data ?? [];
  } catch (err) {
    console.error("Failed to search players", err);
    playersData.value = [];
    errorMessage.value = "An error occurred while searching for players.";
  } finally {
    isPending.value = false;
  }
}

watch(playersData, (val) => {
  allPlayers.value = val ?? [];
});

onMounted(() => {
  if (ENABLE_RECENTS) loadRecents();
  if (playersData.value.length && !allPlayers.value.length) {
    allPlayers.value = playersData.value;
  }
  document.addEventListener("pointerdown", onOutsidePointer, true);
  nextTick(updateDropdownWidth);
});

onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", onOutsidePointer, true);
});

function onOutsidePointer(e: Event) {
  if (!menu.value) return;
  if (!searchContainer.value) return;
  if (!searchContainer.value.contains(e.target as Node)) {
    closeMenu();
  }
}

function updateDropdownWidth() {
  const el = searchContainer.value as HTMLElement | null;
  if (el) {
    dropdownWidth.value = el.getBoundingClientRect().width + "px";
  }
}

function openMenu() {
  menu.value = true;
  nextTick(() => {
    updateDropdownWidth();
    resetActive();
  });
}

function closeMenu() {
  menu.value = false;
  activeIndex.value = -1;
}

function resetActive() {
  activeIndex.value = -1;
}

const debouncedSearch = debounce(() => {
  requestAnimationFrame(() => {
    if (search.value.trim()) searchPlayers(search.value);
    if (search.value && !menu.value) openMenu();
    if (!search.value) allPlayers.value = [];
    resetActive();
  });
}, 500);

watch(search, () => {
  debouncedSearch();
});

const showRecents = computed<boolean>(() => {
  const term = search.value.trim();
  if (!term) {
    if (ENABLE_RECENTS && recentPlayers.value.length) {
      return true;
    }
  }
  return false;
});

const hasAnyPlayers = computed(() => {
  return (
    allPlayers.value.length > 0 ||
    (showRecents.value && recentPlayers.value.length > 0)
  );
});

function escapeHtml(s: string) {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[c] as string)
  );
}

let hlTerm = "";
let hlRe: RegExp | null = null;
function highlight(name: string) {
  const term = search.value.trim();
  if (!term) return escapeHtml(name);
  if (term !== hlTerm) {
    hlRe = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig");
    hlTerm = term;
  }
  return escapeHtml(name).replace(hlRe!, "<mark>$1</mark>");
}

function getCurrentItems() {
  return showRecents.value && !search.value
    ? recentPlayers.value
    : allPlayers.value;
}

function move(delta: number) {
  if (!menu.value) openMenu();
  const items = getCurrentItems();
  if (!items.length) {
    activeIndex.value = -1;
    return;
  }
  let idx = activeIndex.value;
  if (idx < 0) idx = 0;
  else idx = (idx + delta + items.length) % items.length;
  const targetId = items[idx]?.id;
  activeIndex.value = items.findIndex((i) => i.id === targetId);
}

function selectPlayer(p: PlayerSearchDto) {
  selectedPlayer.value = p;
  addRecent(p);
  search.value = p.fullDisplayName ?? "";
  if (p.id) {
    router.push(`/player/${p.id}`);
  }
  closeMenu();
}

function onItemClick(p: PlayerSearchDto) {
  selectPlayer(p);
}

async function onEnter() {
  const items = getCurrentItems();
  if (activeIndex.value >= 0) {
    const cand = items[activeIndex.value];
    if (cand) {
      selectPlayer(cand);
      return;
    }
  }
  const term = search.value.trim();
  if (!term) return;
  const hasLocal = items.some((p) =>
    (p.fullDisplayName?.toLowerCase() || "").includes(term.toLowerCase())
  );
  if (hasLocal) return;

  await searchPlayers(term);
}

function loadRecents() {
  const raw = localStorage.getItem(RECENTS_KEY);
  if (raw) {
    const parsed: PlayerDto[] = JSON.parse(raw);
    recentPlayers.value = parsed
      .slice(0, RECENT_LIMIT)
      .filter((p): p is PlayerSearchDto => Boolean(p));
  }
}

function saveRecents() {
  localStorage.setItem(RECENTS_KEY, JSON.stringify(recentPlayers.value));
}

function addRecent(p: PlayerSearchDto) {
  if (!ENABLE_RECENTS) return;
  recentPlayers.value = [
    p,
    ...recentPlayers.value.filter((r) => r.id !== p.id),
  ].slice(0, RECENT_LIMIT);
  saveRecents();
}

function getMembershipType(membershipType: number): string {
  switch (membershipType) {
    case 1:
      return "Xbox";
    case 2:
      return "PlayStation";
    case 3:
      return "Steam";
    case 4:
      return "Stadia";
    case 5:
      return "Epic";
    default:
      return "Unknown";
  }
}

function getEmblemUrl(path: string): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `https://www.bungie.net${path}`;
}
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(39, 39, 42, 0.5);
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(63, 63, 70, 0.8);
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(82, 82, 91, 0.9);
}

mark {
  background-color: #3b82f6;
  color: white;
  padding: 0 0.25rem;
  border-radius: 0.25rem;
  font-weight: 600;
}
</style>
