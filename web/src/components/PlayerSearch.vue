<template>
  <div class="player-search search-highlight">
    <div ref="searchContainer" class="search-input">
      <v-text-field
        autocomplete="off"
        ref="searchField"
        v-model="search"
        label="Enter Bungie username..."
        density="comfortable"
        variant="outlined"
        hide-details
        clearable
        @focus="openMenu"
        @click:clear="clearSearch"
        @keydown.down.prevent="move(1)"
        @keydown.up.prevent="move(-1)"
        @keydown.enter.prevent="onEnter"
        @keydown.esc="closeMenu"
      >
        <template #prepend-inner>
          <v-icon size="18">mdi-magnify</v-icon>
        </template>
        <template #append-inner>
          <v-progress-circular v-if="isPending" size="16" width="2" indeterminate />
        </template>
      </v-text-field>

      <div v-if="menu" class="search-dropdown" :style="{ width: dropdownWidth }">
        <v-card elevation="4">
          <v-list
            v-if="allPlayers.length || (recentPlayers.length && !search)"
            density="comfortable"
            class="py-0"
            :max-height="360"
            style="overflow-y: auto"
          >
            <v-list-subheader v-if="showRecents && !search" class="text-caption text-disabled">
              Recent Players
            </v-list-subheader>
            <v-list-subheader v-else class="text-caption text-disabled">
              Search Results
            </v-list-subheader>
            <template v-for="(p, i) in showRecents ? recentPlayers : allPlayers" :key="p.id">
              <v-list-item
                :value="p.id"
                :active="i === activeIndex"
                :color="i === activeIndex ? 'primary' : undefined"
                @mouseenter="activeIndex = i"
                :to="`/player/${p.id}`"
                @click="onItemClick(p)"
              >
                <v-list-item-title>
                  <span v-html="highlight(p.fullDisplayName)"></span>
                </v-list-item-title>
                <v-list-item-subtitle v-if="p.membershipType">
                  {{ getMembershipType(p.membershipType) }}
                </v-list-item-subtitle>
              </v-list-item>
            </template>
          </v-list>
          <v-card-text
            v-else-if="!allPlayers.length && !recentPlayers.length && !search.length"
            class="text-center text-caption text-disabled py-4 px-6"
          >
            Start typing to search for players...
          </v-card-text>
          <v-card-text v-else class="text-center text-caption text-disabled py-4 px-6">
            No players found in our database, press enter to search the Destiny API.
          </v-card-text>
        </v-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick, onBeforeUnmount, computed } from 'vue'
import { useRouter } from 'vue-router'
import { type PlayerDTO, type PlayerSearchDTO } from '@/api/models'
import { useSearchPlayer } from '@/hooks'
import { showGlobalError } from '@/hooks/useGlobalError'
import { debounce } from 'vuetify/lib/util/helpers.mjs'

const router = useRouter()

const search = ref('')
const selectedPlayer = ref<PlayerSearchDTO | null>(null)
const allPlayers = ref<PlayerSearchDTO[]>([])

const menu = ref(false)
const activeIndex = ref(-1)
const searchField = ref()
const searchContainer = ref<HTMLElement | null>(null)
const dropdownWidth = ref('360px')

const ENABLE_RECENTS = true
const RECENT_LIMIT = 8
const RECENTS_KEY = 'recentPlayers'
const recentPlayers = ref<PlayerSearchDTO[]>([])

const playersData = ref<PlayerSearchDTO[] | null>(null)

const searchMutation = useSearchPlayer()

const searchPlayers = async (term: string) => {
  if (!searchMutation) return
  playersData.value = await searchMutation.mutateAsync(term.trim())
}

const isPending = computed(() => (searchMutation ? searchMutation.isPending.value : false))
const isError = computed(() => (searchMutation ? searchMutation.isError.value : false))
const error = computed(() => (searchMutation ? searchMutation.error.value : null))

watch(playersData, (val) => {
  if (val) {
    allPlayers.value = val
  } else {
    alert(`No players found for "${search.value}".`)
  }
})

onMounted(() => {
  if (ENABLE_RECENTS) loadRecents()
  if (playersData.value && !allPlayers.value.length) {
    allPlayers.value = playersData.value
  }
  document.addEventListener('pointerdown', onOutsidePointer, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onOutsidePointer, true)
})

function onOutsidePointer(e: Event) {
  if (!menu.value) return
  if (!searchContainer.value) return
  if (!searchContainer.value.contains(e.target as Node)) {
    closeMenu()
  }
}

function openMenu() {
  menu.value = true
  nextTick(() => {
    const el = searchContainer.value?.querySelector('.v-field') as HTMLElement
    if (el) dropdownWidth.value = el.getBoundingClientRect().width + 'px'
    resetActive()
  })
}

function closeMenu() {
  menu.value = false
  activeIndex.value = -1
}

function resetActive() {
  activeIndex.value = -1
}

watch(
  search,
  debounce(() => {
    requestAnimationFrame(() => {
      if (search.value.trim()) searchPlayers(search.value)
      if (search.value && !menu.value) openMenu()
      resetActive()
    })
  }, 500),
)

const showRecents = computed<boolean>(() => {
  const term = search.value.trim()
  if (!term) {
    if (ENABLE_RECENTS && recentPlayers.value.length) {
      return true
    }
  }
  return false
})

function escapeHtml(s: string) {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[c] as string,
  )
}

let hlTerm = ''
let hlRe: RegExp | null = null
function highlight(name: string) {
  const term = search.value.trim()
  if (!term) return escapeHtml(name)
  if (term !== hlTerm) {
    hlRe = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig')
    hlTerm = term
  }
  return escapeHtml(name).replace(hlRe!, '<mark>$1</mark>')
}

function move(delta: number) {
  if (!menu.value) openMenu()
  const items = allPlayers.value
  if (!items.length) {
    activeIndex.value = -1
    return
  }
  let idx = activeIndex.value
  if (idx < 0) idx = 0
  else idx = (idx + delta + items.length) % items.length
  const targetId = items[idx].id
  activeIndex.value = allPlayers.value.findIndex((i) => i.id === targetId)
}

function selectPlayer(p: PlayerSearchDTO) {
  selectedPlayer.value = p
  addRecent(p)
  search.value = p.fullDisplayName
  router.push(`/player/${p.id}`)
  closeMenu()
}

function onItemClick(p: PlayerSearchDTO) {
  addRecent(p)
  closeMenu()
}

async function onEnter() {
  if (activeIndex.value >= 0) {
    const cand = allPlayers.value[activeIndex.value]
    if (cand) {
      selectPlayer(cand)
      return
    }
  }
  const term = search.value.trim()
  if (!term) return
  const hasLocal = allPlayers.value.some((p) =>
    (p.fullDisplayName.toLowerCase() || '').includes(term.toLowerCase()),
  )
  if (hasLocal) return

  await searchPlayers(term)
}

function clearSearch() {
  search.value = ''
  if (!menu.value) openMenu()
}

function loadRecents() {
  try {
    const raw = localStorage.getItem(RECENTS_KEY)
    if (raw) {
      const parsed: PlayerDTO[] = JSON.parse(raw)
      recentPlayers.value = parsed.slice(0, RECENT_LIMIT)
    }
  } catch {}
}
function saveRecents() {
  localStorage.setItem(RECENTS_KEY, JSON.stringify(recentPlayers.value))
}
function addRecent(p: PlayerSearchDTO) {
  if (!ENABLE_RECENTS) return
  recentPlayers.value = [p, ...recentPlayers.value.filter((r) => r.id !== p.id)].slice(
    0,
    RECENT_LIMIT,
  )
  saveRecents()
}

function getMembershipType(membershipType: number): string {
  switch (membershipType) {
    case 1:
      return 'Xbox'
    case 2:
      return 'PlayStation'
    case 3:
      return 'Steam'
    case 4:
      return 'Stadia'
    case 5:
      return 'Epic'
    default:
      return 'Unknown'
  }
}

watch(isError, (v, prev) => {
  if (v && v !== prev) {
    showGlobalError(error.value, 'An unknown error occurred.')
  }
})

</script>

<style scoped>
.search-input {
  position: relative;
}

.search-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 100;
  margin-top: 4px;
}

.search-dropdown > .v-card {
  width: 100%;
  max-height: 360px;
  overflow-y: auto;
}
</style>
