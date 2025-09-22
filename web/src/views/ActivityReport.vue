<template>
  <div class="activity-report stack">
    <title>{{ pageTitle }}</title>
    <div class="heading-row">
      <div class="titles">
        <h1 class="main-title">{{ activityTitle || 'Activity Report' }}</h1>
        <div class="sub-info" v-if="report">
          <span v-if="env" class="id-chip">Instance: {{ instanceId }}</span>
          <span v-if="durationDisplay"> Duration: {{ durationDisplay }}</span>
          <span v-if="playerCount"> Players: {{ playerCount }}</span>
          <span v-if="periodDisplay"> Started: {{ periodDisplay }}</span>
        </div>
      </div>
    </div>

    <v-progress-linear v-if="isPending" indeterminate color="primary" height="4" class="mb-4" />

    <div v-if="!isPending && isError" class="error-block">
      <p>Error loading activity: {{ errorMessage || error?.message }}</p>
    </div>

    <div v-else-if="!isPending && !report" class="empty-block">No report data available.</div>

    <div v-else class="content stack" v-show="!isPending">
      <div class="activity-summary-grid">
        <div class="summary-pill">
          <div class="label">Total Score</div>
          <div class="value">{{ totalScoreDisplay }}</div>
        </div>
        <div class="summary-pill">
          <div class="label">Total Kills</div>
          <div class="value">{{ totalKills }}</div>
        </div>
        <div class="summary-pill">
          <div class="label">Total Assists</div>
          <div class="value">{{ totalAssists }}</div>
        </div>
        <div class="summary-pill">
          <div class="label">Total Deaths</div>
          <div class="value">{{ totalDeaths }}</div>
        </div>
        <div class="summary-pill" v-if="precisionKills > 0">
          <div class="label">Precision Kills</div>
          <div class="value">{{ precisionKills }}</div>
        </div>
      </div>

      <v-card class="players-card ui-card" elevation="1">
        <v-table density="comfortable" class="stats-table table-shell">
          <thead>
            <tr>
              <th>Player</th>
              <th>Class</th>
              <th>K</th>
              <th>D</th>
              <th>A</th>
              <th>K/D</th>
              <th>KDA</th>
              <th>Eff</th>
              <th>Precision</th>
              <th>Score</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in playerStats" :key="p.characterId">
              <td
                class="player-cell clickable"
                role="button"
                tabindex="0"
                @click="goToPlayer(p)"
                @keyup.enter="goToPlayer(p)"
                @keyup.space.prevent="goToPlayer(p)"
                :aria-label="`View profile for ${p.displayName}`"
              >
                <div class="player-id-block">
                  <v-avatar size="28" class="mr-2" v-if="p.iconUrl">
                    <v-img :src="p.iconUrl" :alt="p.displayName" cover />
                  </v-avatar>
                  <div class="name-block">
                    <div class="sub" v-if="p.globalNameCode">
                      {{ p.globalName }}#{{ p.globalNameCode }}
                    </div>
                  </div>
                </div>
              </td>
              <td>{{ p.characterClass }}</td>
              <td>{{ p.kills }}</td>
              <td>{{ p.deaths }}</td>
              <td>{{ p.assists }}</td>
              <td>{{ formatNumber(p.kdr, 2) }}</td>
              <td>{{ formatNumber(p.kda, 2) }}</td>
              <td>{{ p.efficiency !== null ? formatNumber(p.efficiency, 2) : '-' }}</td>
              <td>{{ p.precisionKills ?? 0 }}</td>
              <td>{{ formatNumber(p.score) }}</td>
              <td>{{ p.timePlayedDisplay }}</td>
            </tr>
          </tbody>
        </v-table>
      </v-card>

      <details v-if="env" class="raw-toggle">
        <summary>Raw JSON (debug)</summary>
        <pre class="raw-json">{{ JSON.stringify(report, null, 2) }}</pre>
      </details>
    </div>
    <ErrorSnackbar v-model="showErrorSnack" :message="errorMessage" />
  </div>
</template>
<script setup lang="ts">
import { computed, watch, watchEffect, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useActivityReport, useDestinyActivity } from '@/hooks'
import ErrorSnackbar from '@/components/ErrorSnackbar.vue'

const props = defineProps<{ instanceId: string }>()

const env = import.meta.env.DEV

const route = useRoute()
const router = useRouter()
function cleanName(name?: string | null) {
  if (!name) return ''
  return name.replace(/: Customize$/i, '').trim()
}
const optimisticName = cleanName(route.query.name as string | undefined)

const {
  data: report,
  isPending: isReportPending,
  isError: isReportError,
  error: reportError,
} = useActivityReport(props.instanceId)

const activityHash = computed<number>(() => {
  const details = report.value?.activityDetails
  return details?.referenceId || 0
})

const {
  data: destinyActivity,
  isPending: isDefPending,
  isError: isDefError,
  error: defError,
} = useDestinyActivity(activityHash)

const isPending = computed(() => isReportPending.value || isDefPending.value)
const isError = computed(() => isReportError.value || isDefError.value)
const error = computed(() => reportError.value || defError.value)

const showErrorSnack = ref(false)
const errorMessage = ref('')

watch([isError, error], ([errState, errObj], [prevErr]) => {
  if (errState && errObj && (errState !== prevErr || showErrorSnack.value === false)) {
    errorMessage.value = (errObj as Error).message || 'Failed to load activity'
    showErrorSnack.value = true
  }
})

const activityTitle = computed(() => {
  const defName = destinyActivity.value?.displayProperties?.name
  return cleanName(defName) || optimisticName
})

const pageTitle = computed(() => {
  const base = 'Activity Report - Caldera Report'
  return activityTitle.value ? `${activityTitle.value} - ${base}` : base
})

watchEffect(() => {
  document.title = pageTitle.value
})

interface EntryValueContainer {
  values?: Record<string, { basic?: { value?: number } }>
}
function valueOf(entry: EntryValueContainer | undefined, key: string): number {
  return entry?.values?.[key]?.basic?.value ?? 0
}

function timeDisplay(seconds: number): string {
  if (!seconds) return '0s'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  if (m === 0) return `${s}s`
  return `${m}m ${s}s`
}

function formatNumber(n: number, digits = 0): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '-'
  return n.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

interface PlayerStatRow {
  characterId: string
  displayName: string
  globalName?: string
  globalNameCode?: number
  iconUrl?: string | null
  membershipId?: string
  membershipType?: number
  characterClass: string
  kills: number
  deaths: number
  assists: number
  kdr: number
  kda: number
  efficiency: number | null
  precisionKills: number | null
  score: number
  timePlayed: number
  timePlayedDisplay: string
}

const playerStats = computed<PlayerStatRow[]>(() => {
  if (!report.value?.entries) return []
  return report.value.entries
    .map((e) => {
      const kills = valueOf(e, 'kills')
      const deaths = valueOf(e, 'deaths')
      const assists = valueOf(e, 'assists')
      const precisionKills = e.extended?.values?.precisionKills?.basic?.value ?? null
      const efficiencyRaw = valueOf(e, 'efficiency') || null
      const score = valueOf(e, 'score')
      const timePlayed = valueOf(e, 'timePlayedSeconds')
      const kdr = deaths === 0 ? kills : kills / Math.max(1, deaths)
      const kda = deaths === 0 ? kills + assists : (kills + assists) / Math.max(1, deaths)
      return {
        characterId: e.characterId,
        displayName: e.player?.destinyUserInfo?.displayName || 'Unknown',
        globalName: e.player?.destinyUserInfo?.bungieGlobalDisplayName,
        globalNameCode: e.player?.destinyUserInfo?.bungieGlobalDisplayNameCode,
        iconUrl: e.player?.destinyUserInfo?.iconPath
          ? `https://www.bungie.net${e.player.destinyUserInfo.iconPath}`
          : null,
        membershipId: e.player?.destinyUserInfo?.membershipId,
        membershipType: e.player?.destinyUserInfo?.membershipType,
        characterClass: e.player?.characterClass ?? '-',
        kills,
        deaths,
        assists,
        kdr,
        kda,
        efficiency: efficiencyRaw,
        precisionKills,
        score,
        timePlayed,
        timePlayedDisplay: timeDisplay(timePlayed),
      }
    })
    .sort((a, b) => b.score - a.score)
})

const totalKills = computed(() => playerStats.value.reduce((s, p) => s + p.kills, 0))
const totalAssists = computed(() => playerStats.value.reduce((s, p) => s + p.assists, 0))
const totalDeaths = computed(() => playerStats.value.reduce((s, p) => s + p.deaths, 0))
const precisionKills = computed(() =>
  playerStats.value.reduce((s, p) => s + (p.precisionKills || 0), 0),
)
const totalScore = computed(() => playerStats.value.reduce((s, p) => s + p.score, 0))
const totalScoreDisplay = computed(() => formatNumber(totalScore.value))
const durationSeconds = computed(() =>
  valueOf(report.value?.entries?.[0], 'activityDurationSeconds'),
)
const durationDisplay = computed(() => timeDisplay(durationSeconds.value))
const playerCount = computed(() => report.value?.entries?.length || 0)
const periodDisplay = computed(() => {
  if (!report.value?.period) return ''
  try {
    const d = new Date(report.value.period)
    return d.toLocaleString()
  } catch {
    return ''
  }
})

function goToPlayer(p: PlayerStatRow) {
  if (!p.membershipId || p.membershipType === undefined) return
  router.push({
    name: 'Player',
    params: { membershipId: p.membershipId },
    query: { membershipType: p.membershipType },
  })
}
</script>

<style scoped>
.activity-summary-grid {
  display: grid;
  gap: var(--space-8);
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
}
.summary-pill {
  padding: var(--space-6) var(--space-7);
  background: var(--color-bg-alt);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  box-shadow: var(--shadow-sm);
}
.summary-pill .label {
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.75px;
  color: var(--color-text-soft);
}
.summary-pill .value {
  font-size: var(--text-lg);
  font-weight: 600;
}
.player-id-block {
  display: flex;
  align-items: center;
}
</style>
