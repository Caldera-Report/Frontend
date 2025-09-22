<template>
  <title>{{ pageTitle }}</title>
  <div class="leaderboard-layout">
    <h1 class="page-title">Leaderboards</h1>
    <div class="leaderboard-controls">
      <v-select
        v-model="selectedType"
        :items="leaderboardTypeItems"
        item-title="label"
        item-value="value"
        label="Leaderboard Type"
        density="comfortable"
        variant="outlined"
        class="form-control"
      />
      <v-text-field
        v-model="searchTerm"
        label="Search players..."
        density="comfortable"
        variant="outlined"
        hide-details
        clearable
        class="form-control search-box"
      >
        <template #prepend-inner>
          <v-icon size="18">mdi-magnify</v-icon>
        </template>
      </v-text-field>
      <v-autocomplete
        v-model="selectedActivityId"
        :items="activityItems"
        item-title="label"
        item-value="value"
        label="Activity"
        density="comfortable"
        variant="outlined"
        class="form-control"
        :loading="activitiesPending"
        :search="activitySearch"
        placeholder="Search activity..."
      >
        <template #item="{ props: itemProps, index, item }">
          <template v-if="shouldShowSubheader(index, item.raw.group)">
            <v-list-subheader class="group-header">{{ item.raw.group }}</v-list-subheader>
          </template>
          <v-list-item v-bind="itemProps" :title="item.raw.label" />
        </template>
      </v-autocomplete>
    </div>

    <v-progress-linear v-if="isPending" indeterminate color="primary" height="4" class="mb-4" />

    <v-alert v-if="!isPending && isError" type="error" variant="tonal" class="mb-4">
      {{ errorMessage || (error && (error as Error).message) }}
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
          <tr v-for="(row, idx) in displayedRows" :key="row.player.id">
            <td class="rank-col">{{ idx + 1 }}</td>
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
                <v-avatar v-if="row.player.lastPlayedCharacterEmblemPath" size="28" class="mr-2">
                  <v-img
                    :src="'https://www.bungie.net' + row.player.lastPlayedCharacterEmblemPath"
                    :alt="row.player.fullDisplayName"
                    cover
                  />
                </v-avatar>
                <div class="names">
                  <div class="primary" v-html="highlight(row.player.fullDisplayName)"></div>
                  <div v-if="row.player.displayNameCode" class="secondary">
                    {{ row.player.displayName }}#{{ row.player.displayNameCode }}
                  </div>
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
    <ErrorSnackbar v-model="showErrorSnack" :message="errorMessage" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  useAllActivities,
  useBestTimesLeaderboard,
  useCompletionsLeaderboard,
  useTotalTimeLeaderboard,
} from '@/hooks'
import type {
  TimeLeaderBoardResponse,
  CompletionsLeaderBoardResponse,
  PlayerDTO,
} from '@/api/models'
import ErrorSnackbar from '@/components/ErrorSnackbar.vue'

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

const completionsQuery = useCompletionsLeaderboard(selectedActivityId)
const bestTimesQuery = useBestTimesLeaderboard(selectedActivityId)
const totalTimeQuery = useTotalTimeLeaderboard(selectedActivityId)

const activeQuery = computed(() => {
  if (selectedType.value === 'completions') return completionsQuery
  if (selectedType.value === 'besttimes') return bestTimesQuery
  return totalTimeQuery
})

const isPending = computed(() => activeQuery.value.isPending.value || activitiesPending.value)
const isError = computed(() => activeQuery.value.isError.value || activitiesError.value || false)
const error = computed(() => activeQuery.value.error.value || activitiesErrObj.value || null)

const showErrorSnack = ref(false)
const errorMessage = ref('')

watch([isError, error], ([errState, errObj], [prevErrState]) => {
  if (errState && errObj && (errState !== prevErrState || showErrorSnack.value === false)) {
    errorMessage.value = (errObj as Error).message || 'Failed to load leaderboard'
    showErrorSnack.value = true
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
    query: { membershipType: player.membershipType },
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
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-6);
  align-items: flex-end;
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
}
.rank-col {
  width: 56px;
  text-align: right;
  font-variant-numeric: tabular-nums;
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
}
.player-name-block .secondary {
  font-size: var(--text-xs);
  opacity: 0.65;
}
.stat-col {
  width: 160px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
@media (max-width: 860px) {
  .leaderboard-controls {
    flex-direction: column;
    align-items: stretch;
  }
  .leaderboard-controls .form-control {
    width: 100%;
  }
}
</style>
