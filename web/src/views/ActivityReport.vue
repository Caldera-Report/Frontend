<template>
  <div class="activity-report stack">
    <title>{{ pageTitle }}</title>
    <div class="heading-row">
      <div class="titles">
        <h1 class="main-title">{{ activityTitle || 'Activity Report' }}</h1>
      </div>
    </div>

    <v-progress-linear v-if="isPending" indeterminate color="primary" height="4" class="mb-4" />

    <div v-if="!isPending && isError" class="error-block">
      <p>Error loading activity: {{ error?.message || 'Failed to load activity' }}</p>
    </div>

    <div v-else-if="!isPending && !report" class="empty-block">No report data available.</div>

    <div v-else class="content stack" v-show="!isPending">
      <section class="activity-stats-cluster" aria-labelledby="stats-heading">
        <h2 id="stats-heading" class="visually-hidden">Activity Summary</h2>
        <div class="stat-hero" aria-label="Total Score">
          <div class="stat-hero-label">Total Score</div>
          <div class="stat-hero-value">{{ totalScoreDisplay }}</div>
          <div class="stat-hero-meta">
            <span v-if="durationDisplay">Duration: {{ durationDisplay }}</span>
            <span v-if="playerCount">Players: {{ playerCount }}</span>
            <span v-if="report?.period">Date: {{ new Date(report.period).toLocaleString() }}</span>
          </div>
        </div>
      </section>

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
  </div>
</template>
<script setup lang="ts">
import { computed, watch, watchEffect } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useActivityReport, useDestinyActivity } from '@/hooks'
import { showGlobalError } from '@/hooks/useGlobalError'

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

watch([isError, error], ([errState, errObj], [prevErr]) => {
  if (errState && errObj && errState !== prevErr) {
    showGlobalError(errObj, 'Failed to load activity')
  }
})

const activityTitle = computed(() => {
  const defName = cleanName(destinyActivity.value?.displayProperties?.name)
  return defName || optimisticName
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

const totalScore = computed(() => playerStats.value.reduce((s, p) => s + p.score, 0))
const totalScoreDisplay = computed(() => formatNumber(totalScore.value))
const durationSeconds = computed(() =>
  valueOf(report.value?.entries?.[0], 'activityDurationSeconds'),
)
const durationDisplay = computed(() => timeDisplay(durationSeconds.value))
const playerCount = computed(() => report.value?.entries?.length || 0)

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
.activity-stats-cluster {
  margin-bottom: var(--space-10);
  display: grid;
  gap: var(--space-10);
}
.stat-hero {
  background: var(--color-bg-alt);
  border: 1px solid rgba(var(--color-accent-rgb) / 0.4);
  padding: clamp(var(--space-4), 2vw, var(--space-7));
  border-radius: var(--radius-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.stat-hero-label {
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--color-text-soft);
}
.stat-hero-value {
  font-size: clamp(1.8rem, 4.5vw, 2.8rem);
  font-weight: 700;
  background: linear-gradient(90deg, var(--color-accent), var(--color-accent-hover));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  line-height: 1;
}
.stat-hero-meta {
  display: flex;
  gap: var(--space-4);
  flex-wrap: wrap;
  font-size: var(--text-xs);
  color: var(--color-text-soft);
}
.stat-grid {
  --min-tile: 120px;
  display: grid;
  gap: var(--space-5);
  grid-template-columns: repeat(auto-fill, minmax(var(--min-tile), 1fr));
}
.stat {
  background: var(--color-bg-alt);
  border: 1px solid var(--color-border);
  padding: var(--space-4) var(--space-5);
  border-radius: var(--radius-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  position: relative;
  transition:
    background var(--transition),
    border-color var(--transition),
    transform var(--transition),
    box-shadow var(--transition);
}
.stat:hover {
  background: var(--color-bg-hover);
  border-color: var(--color-border-strong);
  transform: translateY(-3px);
  box-shadow: var(--shadow-md);
}
.stat dt {
  font-size: var(--text-2xs);
  text-transform: uppercase;
  letter-spacing: 0.7px;
  color: var(--color-text-soft);
}
.stat dd {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 600;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}
.heading-row {
  position: relative;
  padding-bottom: var(--space-2);
  margin-bottom: var(--space-8);
}
.players-card {
  overflow: hidden;
}
:deep(.stats-table thead tr) {
  background: linear-gradient(180deg, #101014, #0d0d10);
}
:deep(.stats-table thead th) {
  position: sticky;
  top: 0;
  z-index: 2;
  background: #101014;
  box-shadow: 0 2px 0 0 rgba(0, 0, 0, 0.4);
}
:deep(.stats-table tbody tr) {
  transition:
    background var(--transition),
    color var(--transition);
}
:deep(.stats-table tbody tr:hover) {
  background: var(--color-bg-hover) !important;
}
:deep(.stats-table tbody tr:hover td) {
  color: var(--color-text);
}
:deep(.player-cell.clickable) {
  cursor: pointer;
  outline: none;
}
:deep(.player-cell.clickable:focus-visible) {
  box-shadow: 0 0 0 2px var(--color-focus-ring) inset;
}
:deep(.player-cell.clickable:hover .sub),
:deep(.player-cell.clickable:focus-visible .sub) {
  color: var(--color-accent);
}
.raw-toggle {
  font-size: var(--text-xs);
  background: var(--color-bg-alt);
  border: 1px solid var(--color-border);
  padding: var(--space-4) var(--space-6);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-sm);
}
.raw-toggle[open] {
  border-color: var(--color-accent);
}
.raw-toggle summary {
  cursor: pointer;
  color: var(--color-text-soft);
  transition: color var(--transition);
}
.raw-toggle summary:hover {
  color: var(--color-text);
}
.raw-json {
  max-height: 320px;
  overflow: auto;
  margin-top: var(--space-6);
  background: #0d0d10;
  padding: var(--space-6);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  line-height: 1.3;
}
.player-id-block {
  display: flex;
  align-items: center;
}
</style>
