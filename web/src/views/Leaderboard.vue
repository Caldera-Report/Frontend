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
              value="besttimes"
              :aria-pressed="selectedType === 'besttimes'"
              prepend-icon="mdi-timer-outline"
            >
              <span class="btn-text">Best</span>
            </v-btn>
            <v-btn
              value="totaltime"
              :aria-pressed="selectedType === 'totaltime'"
              prepend-icon="mdi-timer-sand-complete"
            >
              <span class="btn-text">Total</span>
            </v-btn>
          </v-btn-toggle>
        </div>
      </div>
    </div>

    <v-progress-linear v-if="isPending" indeterminate color="primary" height="4" class="mb-4" />

    <v-alert v-if="!isPending && isError" type="error" variant="tonal" class="mb-4">
      {{ (error && (error as Error).message) || 'Failed to load leaderboard' }}
    </v-alert>

    <div v-if="rows.length" class="leaderboard-table-wrapper" ref="tableWrapper" @scroll="onScroll">
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
            <td class="rank-col">{{ rankLookup.get(row.player.id) ?? '' }}</td>
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
            <td v-if="isCompletionsRow(row)" class="stat-col">{{ row.completions }}</td>
            <td v-else-if="isTimeRow(row)" class="stat-col monospace">{{ row.time }}</td>
            <td v-else class="stat-col">—</td>
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
import { useAllActivities, useLeaderboard } from '@/hooks'
import type {
  TimeLeaderBoardResponse,
  CompletionsLeaderBoardResponse,
  PlayerDTO,
} from '@/api/models'
import { showGlobalError } from '@/hooks/useGlobalError'

defineOptions({ name: 'LeaderboardsView' })
const props = defineProps<{ type?: string; activityId?: string }>()

const route = useRoute()
const router = useRouter()

const leaderboardTypeItems = [
  { label: 'Completions', value: 'completions' },
  { label: 'Best Times', value: 'besttimes' },
  { label: 'Total Time', value: 'totaltime' },
]

const selectedType = ref<'completions' | 'besttimes' | 'totaltime'>(
  (props.type as string) && ['completions', 'besttimes', 'totaltime'].includes(props.type!)
    ? (props.type as 'completions' | 'besttimes' | 'totaltime')
    : 'completions',
)
const selectedActivityId = ref<string>(
  props.activityId ?? (route.params.activityId as string) ?? '0',
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
  const items: ActivityItem[] = [{ label: 'All', value: '0', group: 'All' }]
  if (!opTypes.value) return items
  for (const opType of opTypes.value) {
    if (!opType.activities || !opType.activities.length) continue
    for (const act of opType.activities) {
      items.push({ label: act.name, value: act.id, group: opType.name })
    }
  }
  return items
})

function shouldShowSubheader(index: number, group: string) {
  if (group === 'All') return index === 0
  if (index === 0) return true
  const prev = activityItems.value[index - 1]
  return !prev || prev.group !== group
}

const leaderboardQuery = useLeaderboard(selectedType, selectedActivityId)
const activeQuery = computed(() => leaderboardQuery)

const isPending = computed(() => leaderboardQuery.isPending.value || activitiesPending.value)
const isError = computed(() => leaderboardQuery.isError.value || activitiesError.value || false)
const error = computed(() => leaderboardQuery.error.value || activitiesErrObj.value || null)

watch([isError, error], ([errState, errObj], [prevErrState]) => {
  if (errState && errObj && errState !== prevErrState) {
    showGlobalError(errObj, 'Failed to load leaderboard')
  }
})

type LeaderboardRow = (CompletionsLeaderBoardResponse | TimeLeaderBoardResponse) & {
  player: PlayerDTO
}
const rows = computed<LeaderboardRow[]>(() => {
  const data = activeQuery.value.data.value
  if (!data) return []
  return data as LeaderboardRow[]
})

const rankLookup = computed(() => {
  const map = new Map<string, number>()
  rows.value.forEach((r, i) => map.set(r.player.id, i + 1))
  return map
})

const searchTerm = ref('')
const INITIAL_COUNT = 100
const BATCH_SIZE = 75
const visibleCount = ref(INITIAL_COUNT)

const filteredRows = computed(() => {
  const term = searchTerm.value.trim().toLowerCase()
  if (!term) return rows.value
  return rows.value.filter((r) => r.player.fullDisplayName.toLowerCase().includes(term))
})

const displayedRows = computed(() => filteredRows.value.slice(0, visibleCount.value))

watch([rows, searchTerm], () => {
  visibleCount.value = INITIAL_COUNT
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
  const term = searchTerm.value.trim()
  if (!term) return escapeHtml(name)
  if (term !== hlTerm) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    hlRe = new RegExp('(' + escaped + ')', 'ig')
    hlTerm = term
  }
  return escapeHtml(name).replace(hlRe!, '<mark>$1</mark>')
}

function maybeGrowVisible() {
  if (visibleCount.value >= rows.value.length) return
  visibleCount.value = Math.min(visibleCount.value + BATCH_SIZE, rows.value.length)
}

const tableWrapper = ref<HTMLElement | null>(null)
function onScroll() {
  const el = tableWrapper.value
  if (!el) return
  const threshold = 200
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - threshold) {
    maybeGrowVisible()
  }
}

function isCompletionsRow(
  r: LeaderboardRow,
): r is CompletionsLeaderBoardResponse & { player: PlayerDTO } {
  return 'completions' in r
}
function isTimeRow(r: LeaderboardRow): r is TimeLeaderBoardResponse & { player: PlayerDTO } {
  return 'time' in r
}

const pageTitle = computed(() => {
  const label = leaderboardTypeItems.find((t) => t.value === selectedType.value)?.label
  const actLabel = activityItems.value.find((a) => a.value === selectedActivityId.value)?.label
  if (selectedType.value === 'totaltime') return `${label} Leaderboard - Caldera Report`
  return `${label} - ${actLabel} - Caldera Report`
})

watch([selectedType, selectedActivityId], ([type, act]) => {
  if (route.params.type !== type || route.params.activityId !== act) {
    router.replace({ name: 'Leaderboard', params: { type, activityId: act } })
  }
})

function goToPlayer(player: PlayerDTO) {
  if (!player?.id || player.membershipType === undefined) return
  router.push({
    name: 'Player',
    params: { membershipId: player.id },
  })
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
