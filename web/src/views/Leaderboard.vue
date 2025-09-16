<template>
  <title>{{ pageTitle }}</title>
  <div class="leaderboard-page">
    <h1 class="page-title">Leaderboards</h1>
    <div class="controls">
      <v-select
        v-model="selectedType"
        :items="leaderboardTypeItems"
        item-title="label"
        item-value="value"
        label="Leaderboard Type"
        density="comfortable"
        variant="outlined"
        class="control-item"
      />
      <v-autocomplete
        v-model="selectedActivityId"
        :items="activityItems"
        item-title="label"
        item-value="value"
        label="Activity"
        density="comfortable"
        variant="outlined"
        class="control-item"
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
      <v-btn
        variant="tonal"
        color="primary"
        @click="refetchCurrent"
        :loading="anyPending"
        class="control-item"
      >
        Refresh
      </v-btn>
    </div>

    <v-progress-linear v-if="anyPending" indeterminate color="primary" height="4" class="mb-4" />

    <v-alert v-if="anyError" type="error" variant="tonal" class="mb-4">
      {{ errorMessage }}
    </v-alert>

    <div v-if="rows.length" class="table-wrapper elevation-2">
      <table class="leaderboard-table">
        <thead>
          <tr>
            <th class="rank-col">#</th>
            <th class="player-col">Player</th>
            <th v-if="selectedType === 'completions'" class="stat-col">Completions</th>
            <th v-else class="stat-col">Time</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, idx) in rows" :key="row.player.id">
            <td class="rank-col">{{ idx + 1 }}</td>
            <td class="player-col player-name">{{ row.player.fullDisplayName }}</td>
            <td v-if="isCompletionsRow(row)" class="stat-col">{{ row.completions }}</td>
            <td v-else-if="isTimeRow(row)" class="stat-col monospace">{{ row.time }}</td>
            <td v-else class="stat-col">—</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else-if="!anyPending && !anyError" class="empty-state">
      <span>No data available.</span>
    </div>
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
import type { TimeLeaderBoardResponse, CompletionsLeaderBoardResponse } from '@/api/models'

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

const anyPending = computed(() => activeQuery.value.isPending.value || activitiesPending.value)
const anyError = computed(() => activeQuery.value.isError.value || activitiesError.value || false)
const errorMessage = computed(
  () =>
    (activeQuery.value.error.value as Error)?.message ||
    (activitiesErrObj.value as Error)?.message ||
    'Error loading data',
)

type Row = (CompletionsLeaderBoardResponse | TimeLeaderBoardResponse) & { player: any }
const rows = computed<Row[]>(() => {
  const data = activeQuery.value.data.value as any[] | undefined
  if (!data) return []
  return data as Row[]
})

function isCompletionsRow(r: Row): r is CompletionsLeaderBoardResponse {
  return (r as any).completions !== undefined
}
function isTimeRow(r: Row): r is TimeLeaderBoardResponse {
  return (r as any).time !== undefined
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

function refetchCurrent() {
  if (selectedType.value === 'completions') completionsQuery.refetch()
  else if (selectedType.value === 'besttimes') bestTimesQuery.refetch()
  else totalTimeQuery.refetch()
}
</script>

<style scoped>
.leaderboard-page {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.page-title {
  margin: 0 0 4px;
  font-size: 1.75rem;
  font-weight: 600;
}
.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: flex-end;
}
.control-item {
  min-width: 220px;
}
.table-wrapper {
  overflow-x: auto;
  border-radius: 8px;
  background: var(--v-theme-surface);
}
.leaderboard-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.95rem;
}
.leaderboard-table thead {
  background: var(--v-theme-primary);
  color: #fff;
}
.leaderboard-table th {
  text-align: left;
  padding: 10px 14px;
  font-weight: 600;
  letter-spacing: 0.5px;
  font-size: 0.8rem;
  text-transform: uppercase;
}
.leaderboard-table td {
  padding: 10px 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}
.leaderboard-table tbody tr:nth-child(odd) {
  background: rgba(255, 255, 255, 0.02);
}
.leaderboard-table tbody tr:hover {
  background: rgba(255, 255, 255, 0.05);
}
.rank-col {
  width: 52px;
  font-weight: 600;
  text-align: right;
}
.player-col {
  min-width: 260px;
  font-weight: 500;
}
.player-name {
  font-family: system-ui, sans-serif;
}
.stat-col {
  width: 160px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.monospace {
  font-family:
    'JetBrains Mono', 'SFMono-Regular', ui-monospace, Menlo, Monaco, Consolas, 'Liberation Mono',
    monospace;
  font-size: 0.85rem;
}
.empty-state {
  opacity: 0.8;
  font-size: 0.95rem;
  padding: 12px;
}
.group-header {
  padding: 6px 12px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  opacity: 0.75;
}
@media (max-width: 640px) {
  .controls {
    flex-direction: column;
    align-items: stretch;
  }
  .control-item {
    width: 100%;
  }
  .stat-col {
    text-align: left;
  }
}
</style>
