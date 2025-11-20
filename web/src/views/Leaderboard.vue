<template>
  <title>{{ pageTitle }}</title>
  <div class="leaderboard-layout">
    <h1 class="page-title">Leaderboards</h1>
    <div class="leaderboard-controls">
      <div class="controls-top">
        <label class="group-label" for="lb-search">Search</label>
        <v-text-field
          id="lb-search"
          v-model="searchTerm"
          placeholder="Search players by name..."
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          density="comfortable"
          hide-details
          clearable
          class="control-search"
        />
      </div>
      <div class="controls-bottom">
        <div class="field activity-field">
          <label class="group-label" for="lb-activity">Activity</label>
          <v-autocomplete
            id="lb-activity"
            v-model="selectedActivityId"
            :items="activityItems"
            item-title="label"
            item-value="value"
            variant="outlined"
            density="comfortable"
            class="control-activity"
            :loading="activitiesPending"
            :search="activitySearch"
            placeholder="Filter / search activities..."
            hide-details
            clearable
            v-on:update:focused="setActivityToAll"
          >
            <template #item="{ props: itemProps, index, item }">
              <template v-if="shouldShowSubheader(index, item.raw.group)">
                <v-list-subheader class="group-header">{{ item.raw.group }}</v-list-subheader>
              </template>
              <v-list-item v-bind="itemProps" :title="item.raw.label" />
            </template>
          </v-autocomplete>
        </div>
        <div class="field type-field" role="group" aria-label="Leaderboard type">
          <label class="group-label">Type</label>
          <v-btn-toggle
            v-model="selectedType"
            mandatory
            class="type-toggle"
            density="comfortable"
            variant="outlined"
            divided
          >
            <v-btn
              value="completions"
              :aria-pressed="selectedType === 'completions'"
              prepend-icon="mdi-flag-checkered"
            >
              <span class="btn-text">Completions</span>
            </v-btn>
            <v-btn
              value="speed"
              :aria-pressed="selectedType === 'speed'"
              prepend-icon="mdi-timer-outline"
            >
              <span class="btn-text">Best</span>
            </v-btn>
            <v-btn
              value="score"
              :aria-pressed="selectedType === 'score'"
              prepend-icon="mdi-timer-sand-complete"
            >
              <span class="btn-text">Score</span>
            </v-btn>
          </v-btn-toggle>
        </div>
      </div>
    </div>

    <v-progress-linear v-if="isPending" indeterminate color="primary" height="4" class="mb-4" />

    <v-alert v-if="!isPending && isError" type="error" variant="tonal" class="mb-4">
      {{ (error && (error as Error).message) || 'Failed to load leaderboard' }}
    </v-alert>

    <div
      v-if="displayedRows.length"
      class="leaderboard-table-wrapper"
      ref="tableWrapper"
      @scroll="onScroll"
    >
      <table class="table-shell">
        <thead>
          <tr>
            <th class="rank-col">#</th>
            <th class="player-col">Player</th>
            <th v-if="selectedType === 'completions'" class="stat-col">Completions</th>
            <th v-else class="stat-col">Time</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in displayedRows"
            :key="row.player.id"
            :class="['lb-row', { 'has-bg': row.player.lastPlayedCharacterBackgroundPath }]"
            :style="
              row.player.lastPlayedCharacterBackgroundPath
                ? {
                    '--player-bg': `url(https://www.bungie.net${row.player.lastPlayedCharacterBackgroundPath})`,
                  }
                : undefined
            "
          >
            <td class="rank-col">{{ row.rank ?? '' }}</td>
            <td
              class="player-col player-cell"
              role="button"
              tabindex="0"
              @click="goToPlayer(row.player)"
              @keyup.enter="goToPlayer(row.player)"
              @keyup.space.prevent="goToPlayer(row.player)"
              :aria-label="`View profile for ${row.player.fullDisplayName}`"
            >
              <div class="player-name-block">
                <div class="names">
                  <div class="primary" v-html="highlight(row.player.fullDisplayName)"></div>
                </div>
              </div>
            </td>
            <td class="stat-col">{{ row.data }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else-if="!isPending && !isError" class="empty-state">
      <span>No data available.</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAllActivities, useLeaderboard, useSearchLeaderboard } from '@/hooks'
import type { LeaderboardResponse, PlayerDTO } from '@/api/models'
import { showGlobalError } from '@/hooks/useGlobalError'
import { debounce } from 'vuetify/lib/util/helpers.mjs'

defineOptions({ name: 'LeaderboardsView' })
const props = defineProps<{ type?: string; activityId?: string }>()

const route = useRoute()
const router = useRouter()

const leaderboardTypeItems = [
  { label: 'Completions', value: 'completions' },
  { label: 'Best Times', value: 'speed' },
  { label: 'Score', value: 'score' },
]

const selectedType = ref<'completions' | 'speed' | 'score'>(
  (props.type as string) && ['completions', 'speed', 'score'].includes(props.type!)
    ? (props.type as 'completions' | 'speed' | 'score')
    : 'completions',
)

const {
  data: opTypes,
  isPending: activitiesPending,
  isError: activitiesError,
  error: activitiesErrObj,
} = useAllActivities()

const activitySearch = ref('')

interface ActivityItem {
  label: string
  value: string
  group: string
}

const activityItems = computed<ActivityItem[]>(() => {
  const items: ActivityItem[] = []
  if (!opTypes.value) return items
  for (const opType of opTypes.value) {
    if (!opType.activities || !opType.activities.length) continue
    for (const act of opType.activities) {
      items.push({ label: act.name, value: act.id, group: opType.name })
    }
  }
  return items
})

const DEFAULT_ACTIVITY_ID = '2489241976'
function normalizeActivityId(id?: string | string[] | null) {
  if (Array.isArray(id)) {
    return normalizeActivityId(id[0])
  }
  if (!id || id === '0') return DEFAULT_ACTIVITY_ID
  return id
}
function resolveRouteActivityParam(param: unknown): string | undefined {
  if (Array.isArray(param)) return param[0]
  return param as string | undefined
}

const selectedActivityId = ref<string>(
  normalizeActivityId(props.activityId ?? resolveRouteActivityParam(route.params.activityId)),
)

watch(
  () => [props.activityId, route.params.activityId],
  ([propActivityId, routeActivityParam]) => {
    const sanitized = normalizeActivityId(
      propActivityId ?? resolveRouteActivityParam(routeActivityParam),
    )
    if (selectedActivityId.value !== sanitized) {
      selectedActivityId.value = sanitized
    }
  },
  { immediate: true },
)

function shouldShowSubheader(index: number, group: string) {
  if (index === 0) return true
  const prev = activityItems.value[index - 1]
  return !prev || prev.group !== group
}

const PAGE_SIZE = 250
const count = ref(PAGE_SIZE)
const offset = ref(0)
const hasMore = ref(true)

const leaderboardQuery = useLeaderboard(selectedType, selectedActivityId, count, offset)
const activeQuery = computed(() => leaderboardQuery)

const searchMutation = useSearchLeaderboard()

const searchTerm = ref('')
const searchResults = ref<LeaderboardRow[] | null>(null)
const isSearchMode = computed(() => !!(searchTerm.value ?? '').trim())

const isPending = computed(
  () =>
    activitiesPending.value ||
    (isSearchMode.value ? searchMutation.isPending.value : leaderboardQuery.isPending.value),
)
const isFetching = computed(() => leaderboardQuery.isFetching.value)
const isError = computed(() =>
  isSearchMode.value
    ? searchMutation.isError.value || activitiesError.value || false
    : leaderboardQuery.isError.value || activitiesError.value || false,
)
const error = computed(() =>
  isSearchMode.value
    ? searchMutation.error.value || activitiesErrObj.value || null
    : leaderboardQuery.error.value || activitiesErrObj.value || null,
)

watch([isError, error], ([errState, errObj], [prevErrState]) => {
  if (errState && errObj && errState !== prevErrState) {
    showGlobalError(errObj, 'Failed to load leaderboard')
  }
})

type LeaderboardRow = LeaderboardResponse & {
  player: PlayerDTO
}

const loadedRows = ref<LeaderboardRow[]>([])

watch(
  () => activeQuery.value.data.value,
  (data) => {
    if (!data) return
    if (offset.value === 0) {
      loadedRows.value = data as LeaderboardRow[]
    } else {
      loadedRows.value = [...loadedRows.value, ...(data as LeaderboardRow[])]
    }
    hasMore.value = (data as LeaderboardRow[]).length >= count.value
  },
  { immediate: true },
)

const rows = computed<LeaderboardRow[]>(() => loadedRows.value)

const displayedRows = computed(() => {
  if (isSearchMode.value) return searchResults.value ?? []
  return rows.value
})

const triggerSearch = debounce(async () => {
  if (!searchTerm.value) {
    searchResults.value = null
    return
  }
  const term = searchTerm.value.trim()
  if (!term) {
    searchResults.value = null
    return
  }
  const data = await searchMutation.mutateAsync({
    type: selectedType.value,
    activityId: selectedActivityId.value,
    playerName: term,
  })
  searchResults.value = data as LeaderboardRow[]
}, 500)

watch([searchTerm, selectedType, selectedActivityId], () => {
  triggerSearch()
})

function escapeHtml(s: string) {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  )
}
let hlTerm = ''
let hlRe: RegExp | null = null
function highlight(name: string) {
  if (!searchTerm.value) return escapeHtml(name)
  const term = searchTerm.value.trim()
  if (!term) return escapeHtml(name)
  if (term !== hlTerm) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    hlRe = new RegExp('(' + escaped + ')', 'ig')
    hlTerm = term
  }
  return escapeHtml(name).replace(hlRe!, '<mark>$1</mark>')
}

const tableWrapper = ref<HTMLElement | null>(null)
function onScroll() {
  const el = tableWrapper.value
  if (!el) return
  const threshold = 200
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - threshold) {
    maybeLoadMore()
  }
}

function maybeLoadMore() {
  if (isSearchMode.value) return
  if (!hasMore.value) return
  if (isFetching.value) return
  offset.value += count.value
}

const pageTitle = computed(() => {
  const label = leaderboardTypeItems.find((t) => t.value === selectedType.value)?.label
  const actLabel = activityItems.value.find((a) => a.value === selectedActivityId.value)?.label
  if (selectedType.value === 'score') return `${label} Leaderboard - Caldera Report`
  return `${label} - ${actLabel} - Caldera Report`
})

watch(
  [selectedType, selectedActivityId],
  ([type, act]) => {
    const routeActivityId = resolveRouteActivityParam(route.params.activityId)
    if (route.params.type !== type || routeActivityId !== act) {
      router.replace({ name: 'Leaderboard', params: { type, activityId: act } })
    }
    offset.value = 0
    hasMore.value = true
    loadedRows.value = []
    if (tableWrapper.value) tableWrapper.value.scrollTop = 0
  },
  { immediate: true },
)

function goToPlayer(player: PlayerDTO) {
  if (!player?.id || player.membershipType === undefined) return
  router.push({
    name: 'Player',
    params: { membershipId: player.id },
  })
}

function fallbackActivityId() {
  return (
    activityItems.value.find((item) => item.value === DEFAULT_ACTIVITY_ID)?.value ??
    activityItems.value[0]?.value ??
    DEFAULT_ACTIVITY_ID
  )
}

function setActivityToAll(isActive: boolean) {
  const needsReset =
    selectedActivityId.value === undefined ||
    selectedActivityId.value === null ||
    selectedActivityId.value === ''
  if (!isActive && needsReset) {
    selectedActivityId.value = fallbackActivityId()
  }
}
</script>

<style scoped>
.leaderboard-layout {
  display: flex;
  flex-direction: column;
  gap: var(--space-10);
}
.leaderboard-controls {
  position: sticky;
  top: 0;
  z-index: 15;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-5) var(--space-6) var(--space-6);
  margin: calc(-1 * var(--space-4)) calc(-1 * var(--space-6)) var(--space-2);
  backdrop-filter: blur(12px) saturate(1.2);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: var(--radius-lg);
  box-shadow: 0 4px 28px -8px rgba(0, 0, 0, 0.55);
}
.leaderboard-controls .group-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  opacity: 0.65;
  margin-bottom: 4px;
  display: inline-block;
}
.leaderboard-controls .controls-top {
  display: flex;
  flex-direction: column;
}
.leaderboard-controls .controls-top .control-search :deep(input) {
  font-variant-numeric: normal;
}
.leaderboard-controls .controls-bottom {
  display: flex;
  gap: var(--space-5);
  align-items: flex-end;
  flex-wrap: wrap;
}
.leaderboard-controls .controls-bottom .field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.leaderboard-controls .activity-field {
  flex: 1 1 520px;
  min-width: 260px;
}
.leaderboard-controls .type-field {
  flex: 0 0 auto;
}
.leaderboard-controls .type-toggle :deep(.v-btn) {
  text-transform: none;
  font-size: 12px;
  letter-spacing: 0.4px;
}
.leaderboard-controls .type-toggle :deep(.v-btn .v-btn__prepend) {
  margin-inline-end: 4px;
}
.leaderboard-controls .type-toggle :deep(.v-btn.v-btn--active) {
  background: rgba(120, 140, 255, 0.15);
  box-shadow: inset 0 0 0 1px rgba(140, 160, 255, 0.35);
}
.leaderboard-controls .type-toggle :deep(.v-btn:not(.v-btn--active):hover) {
  background: rgba(255, 255, 255, 0.06);
}
.leaderboard-controls .btn-text {
  position: relative;
  top: -1px;
}
.leaderboard-controls .control-search {
  --search-height: 46px;
}
.leaderboard-controls .control-search :deep(.v-field) {
  min-height: var(--search-height);
}
.leaderboard-controls .control-activity :deep(.v-field) {
  min-height: 46px;
}
@media (max-width: 880px) {
  .leaderboard-controls {
    padding: var(--space-5) var(--space-5) var(--space-5);
  }
  .leaderboard-controls .controls-bottom {
    gap: var(--space-4);
  }
}
@media (max-width: 620px) {
  .leaderboard-controls {
    position: static;
    margin: 0 0 var(--space-4);
  }
  .leaderboard-controls .controls-bottom {
    flex-direction: column;
    align-items: stretch;
  }
  .leaderboard-controls .activity-field,
  .leaderboard-controls .type-field {
    width: 100%;
  }
  .leaderboard-controls .type-field {
    padding-top: 4px;
  }
  .leaderboard-controls .activity-field {
    flex: 0 0 auto;
  }
}
.leaderboard-table-wrapper {
  overflow: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-bg-alt);
  box-shadow: var(--shadow-md);
  max-height: 72vh;
  position: relative;
}
.leaderboard-table-wrapper table {
  width: 100%;
}
.leaderboard-table-wrapper mark {
  background: var(--color-mark-bg);
  color: inherit;
  padding: 0 2px;
  border-radius: 2px;
}
.lb-row {
  position: relative;
}
.lb-row.has-bg {
  color: var(--color-text-on-image, #f5f6f9);
}
.lb-row.has-bg {
  background-image:
    linear-gradient(
      90deg,
      rgba(10, 10, 14, 0.78),
      rgba(10, 10, 14, 0.46) 55%,
      rgba(10, 10, 14, 0.18)
    ),
    var(--player-bg);
  background-size: cover, cover;
  background-position: center, center;
  background-repeat: no-repeat;
  filter: saturate(1.08);
}
.lb-row.has-bg:hover {
  background-image:
    linear-gradient(
      90deg,
      rgba(10, 10, 14, 0.9),
      rgba(10, 10, 14, 0.6) 55%,
      rgba(10, 10, 14, 0.25)
    ),
    var(--player-bg);
}
.lb-row > td {
  position: relative;
  padding: 20px 16px;
}
.lb-row:not(.has-bg):hover {
  background: rgba(255, 255, 255, 0.04);
}
.lb-row + .lb-row > td {
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}
.lb-row.has-bg + .lb-row.has-bg > td {
  border-top-color: rgba(255, 255, 255, 0.15);
}
.lb-row.has-bg mark {
  background: rgba(255, 255, 255, 0.18);
}
.rank-col {
  width: 56px;
  text-align: right;
  font-variant-numeric: tabular-nums;
  padding-right: 12px;
}
.player-cell {
  cursor: pointer;
}
.player-cell:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}
.player-name-block {
  display: flex;
  align-items: center;
  min-width: 0;
}
.player-name-block .names {
  display: flex;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.55);
  flex-direction: column;
  line-height: 1.05;
}
.player-name-block .primary {
  font-weight: 600;
  font-size: var(--text-md);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 260px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.55);
}
@media (max-width: 1080px) {
  .leaderboard-controls .controls-row {
    flex-wrap: wrap;
  }
  .leaderboard-controls .control-search {
    flex: 1 1 100%;
    order: 1;
  }
  .leaderboard-controls .control-activity {
    flex: 2 1 60%;
    order: 2;
  }
  .leaderboard-controls .control-type-toggle {
    order: 3;
  }
}
@media (max-width: 640px) {
  .leaderboard-controls .controls-row {
    flex-direction: column;
  }
  .leaderboard-controls .control-search,
  .leaderboard-controls .control-activity,
  .leaderboard-controls .control-type-toggle {
    width: 100%;
  }
  .leaderboard-controls .control-type-toggle {
    align-items: flex-start;
  }
  .leaderboard-controls .type-label {
    padding-left: 4px;
  }
  .player-name-block .primary {
    max-width: 180px;
  }
}
@media (max-width: 420px) {
  .player-name-block .primary {
    max-width: 140px;
  }
}
</style>
