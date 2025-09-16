<template>
  <v-card class="activity-card" elevation="2">
    <div class="banner" :style="{ backgroundImage: `url(${imageUrl})` }">
      <div class="banner-overlay">
        <h3 class="name">{{ activityName }}</h3>
      </div>
    </div>
    <div class="content">
      <v-progress-linear v-if="isPending" indeterminate color="primary" height="3" class="mb-1" />
      <div v-if="isError" class="error-state d-flex align-center justify-space-between">
        <span class="error-text">Failed to load reports</span>
        <v-btn size="x-small" variant="tonal" color="error" @click="refetch">Retry</v-btn>
      </div>
      <div class="stats-row">
        <div class="primary-stat">
          <div class="value">{{ totalClears }}</div>
          <div class="label">Total Clears</div>
        </div>
        <div class="other-stats">
          <div class="stat">
            <div class="value">{{ recentDurationFormatted }}</div>
            <div class="label">Recent</div>
          </div>
          <div class="stat">
            <div class="value">{{ fastestDurationFormatted }}</div>
            <div class="label">Fastest</div>
          </div>
          <div class="stat">
            <div class="value">{{ averageDurationFormatted }}</div>
            <div class="label">Average</div>
          </div>
        </div>
      </div>
      <div
        class="graph-wrapper"
        ref="graphWrapperEl"
        :class="{ 'is-scrollable': isScrollable }"
        :style="graphVars"
      >
        <div class="graph" ref="graphEl" :style="{ width: graphRenderWidth + 'px' }">
          <div class="line" :style="{ top: linePosition }" />
          <div class="dots">
            <template v-for="report in reportsSorted" :key="report.id">
              <v-tooltip location="end" :text="dotTooltip(report)">
                <template #activator="{ props: tt }">
                  <div class="dot-wrapper">
                    <button
                      class="dot"
                      v-bind="tt"
                      :style="dotStyle(report)"
                      :class="{ completed: report.completed }"
                      @click="onSelect(report)"
                      tabindex="0"
                    />
                  </div>
                </template>
              </v-tooltip>
            </template>
          </div>
        </div>
      </div>
    </div>
  </v-card>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, nextTick } from 'vue'
import { usePlayerReportsForActivity } from '@/hooks'
import type { ActivityReportDTO } from '@/api/models'

const props = defineProps<{
  imageUrl: string
  activityName: string
  activityId: string
  playerId: string
  ready?: boolean
}>()

const emit = defineEmits<{
  (e: 'select-report', report: ActivityReportDTO): void
  (e: 'error', message: string): void
}>()

const {
  data: reports,
  isPending,
  isError,
  error: loadError,
  refetch,
} = usePlayerReportsForActivity(
  props.playerId,
  props.activityId,
  computed(() => !!props.ready),
)

function refreshReports() {
  console.log('Refreshing reports...')
  refetch()
}

defineExpose({ requestRefresh: refreshReports })

const reportsSorted = computed(() =>
  [...(reports?.value ?? [])].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  ),
)

function parseDuration(raw: unknown): number {
  if (raw == null) return 0
  if (typeof raw === 'number') return raw
  if (typeof raw !== 'string') return 0
  const segs = raw.split(':').map((p) => Number(p))
  if (segs.some((n) => Number.isNaN(n))) return 0
  while (segs.length < 3) segs.unshift(0)
  const [h, m, s] = segs
  return h * 3600 + m * 60 + s
}

const completedReports = computed(() => reportsSorted.value.filter((r) => r.completed))
const totalClears = computed(() => completedReports.value.length)

function formatDurationDetailed(seconds: number | undefined) {
  if (seconds == null || isNaN(seconds) || seconds <= 0) return '-'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  if (h > 0) return `${h}h ${mm}m ${ss}s`
  return `${m}m ${ss}s`
}

const recentCompletion = computed(() => {
  if (!completedReports.value.length) return undefined
  return [...completedReports.value].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )[0]
})
const recentDurationFormatted = computed(() =>
  formatDurationDetailed(parseDuration(recentCompletion.value?.duration)),
)

const fastestCompletion = computed(() => {
  if (!completedReports.value.length) return undefined
  return completedReports.value.reduce((min, cur) =>
    cur.duration < (min?.duration ?? Number.MAX_SAFE_INTEGER) ? cur : min,
  )
})
const fastestDurationFormatted = computed(() =>
  formatDurationDetailed(parseDuration(fastestCompletion.value?.duration)),
)

const averageDurationFormatted = computed(() => {
  if (!completedReports.value.length) return '-'
  const total = completedReports.value.reduce((sum, r) => sum + parseDuration(r.duration), 0)
  return formatDurationDetailed(Math.round(total / completedReports.value.length))
})

watch(
  () => isError.value,
  (val) => {
    if (val && loadError.value) emit('error', (loadError.value as Error).message || 'Error')
  },
)

function timeAgo(date: Date | string) {
  const d = date instanceof Date ? date : new Date(date)
  const diffMs = Date.now() - d.getTime()
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 52) return `${weeks}w ago`
  const years = Math.floor(days / 365)
  return `${years}y ago`
}

function dotTooltip(r: ActivityReportDTO) {
  return `${formatDurationDetailed(parseDuration(r.duration))} • ${timeAgo(r.date)}`
}

function onSelect(r: ActivityReportDTO) {
  emit('select-report', r)
}

const graphEl = ref<HTMLElement | null>(null)
const graphWrapperEl = ref<HTMLElement | null>(null)

const durationDomain = computed(() => {
  const source = reportsSorted.value
  if (!source.length) return { min: 0, max: 0, avg: 0 }
  const min = Math.min(...source.map((r) => parseDuration(r.duration)))
  const max = Math.max(...source.map((r) => parseDuration(r.duration)))
  const avgSource = completedReports.value.length ? completedReports.value : source
  const avg = avgSource.reduce((s, r) => s + parseDuration(r.duration), 0) / avgSource.length || 0
  return { min, max, avg }
})

const isMobile = ref(false)
const metrics = computed(() => {
  if (isMobile.value) {
    return { height: 60, padding: 5, dot: 12, gap: 5, dotWrapperExtra: 2 }
  }
  return { height: 76, padding: 5, dot: 14, gap: 6, dotWrapperExtra: 2 }
})

const wrapperWidth = ref(0)
const isScrollable = ref(false)

const graphWidth = computed(() => {
  const n = reportsSorted.value.length
  if (!n) return 220
  const dotWrapperWidth = metrics.value.dot + metrics.value.dotWrapperExtra
  const totalDots = n * dotWrapperWidth
  const totalGaps = (n - 1) * metrics.value.gap
  const horizontalPadding = 8
  return Math.max(220, totalDots + totalGaps + horizontalPadding)
})

const graphRenderWidth = computed(() => Math.max(graphWidth.value, wrapperWidth.value))

const linePosition = computed(() => `${metrics.value.height / 2 - 1}px`)

const EPSILON = 0.000001

const graphVars = computed(() => ({
  '--graph-height': metrics.value.height + 'px',
  '--graph-dot-size': metrics.value.dot + 'px',
  '--graph-dot-wrapper-width': metrics.value.dot + metrics.value.dotWrapperExtra + 'px',
}))

function dotStyle(r: ActivityReportDTO) {
  const { min, max, avg } = durationDomain.value
  if (max <= min) {
    const centerPx = metrics.value.height / 2
    return { top: `${centerPx.toFixed(2)}px`, transform: 'translateY(-50%)' }
  }
  const d = parseDuration(r.duration)
  const center = metrics.value.height / 2
  const topCenter = metrics.value.padding + metrics.value.dot / 2
  const bottomCenter = metrics.value.height - metrics.value.padding - metrics.value.dot / 2 - 1

  if (
    Math.abs(d - avg) < EPSILON ||
    (Math.abs(avg - min) < EPSILON && Math.abs(d - min) < EPSILON) ||
    (Math.abs(avg - max) < EPSILON && Math.abs(d - max) < EPSILON)
  ) {
    return { top: `${center.toFixed(2)}px`, transform: 'translateY(-50%)' }
  }

  if (d > avg) {
    const denom = max - avg
    const ratioSlow = denom > 0 ? (d - avg) / denom : 0
    const y = center - ratioSlow * (center - topCenter)
    return { top: `${y.toFixed(2)}px`, transform: 'translateY(-50%)' }
  }

  const denomFast = avg - min
  const ratioFast = denomFast > 0 ? (avg - d) / denomFast : 0
  const y = center + ratioFast * (bottomCenter - center)
  return { top: `${y.toFixed(2)}px`, transform: 'translateY(-50%)' }
}

function scrollGraphToRight() {
  if (!graphWrapperEl.value) return
  if (graphWrapperEl.value.scrollWidth > graphWrapperEl.value.clientWidth) {
    graphWrapperEl.value.scrollLeft =
      graphWrapperEl.value.scrollWidth - graphWrapperEl.value.clientWidth
  }
}

onMounted(() => {
  const applyBp = () => {
    isMobile.value = window.innerWidth <= 600
  }
  applyBp()
  window.addEventListener('resize', applyBp)
  const measure = () => {
    if (graphWrapperEl.value) {
      wrapperWidth.value = graphWrapperEl.value.clientWidth
      isScrollable.value = graphWidth.value > wrapperWidth.value
    }
  }
  measure()
  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(() => {
      measure()
    })
    if (graphWrapperEl.value) ro.observe(graphWrapperEl.value)
  }
  nextTick(() => {
    measure()
    scrollGraphToRight()
  })
})

watch(
  () => reportsSorted.value.length,
  () => {
    nextTick(() => scrollGraphToRight())
  },
)
</script>

<style scoped>
.activity-card {
  background: #0d0d11;
  color: #fff;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.banner {
  position: relative;
  background-size: cover;
  background-position: center;
  height: 140px;
}
.banner-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.1) 0%, rgba(0, 0, 0, 0.75) 85%);
  display: flex;
  align-items: flex-end;
  padding: 12px 16px;
}
.name {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.5px;
}
.content {
  padding: 8px 14px 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.stats-row {
  display: flex;
  align-items: stretch;
  gap: 20px;
}
.primary-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-weight: 600;
  min-width: 70px;
}
.primary-stat .value {
  font-size: 2rem;
  line-height: 1;
}
.label {
  font-size: 0.65rem;
  text-transform: uppercase;
  opacity: 0.7;
  letter-spacing: 1px;
}
.other-stats {
  display: flex;
  flex: 1;
  justify-content: space-between;
}
.stat {
  text-align: center;
  flex: 1;
}
.stat .value {
  font-size: 0.95rem;
  font-weight: 600;
}
.graph-wrapper {
  position: relative;
  overflow-x: auto;
  overflow-y: hidden;
}
.graph-wrapper.is-scrollable::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.35);
}
.graph {
  position: relative;
  min-width: 220px;
  padding: 6px 4px 4px;
  height: var(--graph-height, 76px);
}
.graph .line {
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background: rgba(255, 255, 255, 0.35);
  pointer-events: none;
}
.dots {
  display: flex;
  gap: 6px;
  position: relative;
  z-index: 1;
  height: 100%;
  align-items: stretch;
  padding: 0 2px;
}
.dot-wrapper {
  position: relative;
  width: var(--graph-dot-wrapper-width, 18px);
  flex: 0 0 auto;
}
.dot {
  position: absolute;
  left: 1px;
  width: var(--graph-dot-size, 12px);
  height: var(--graph-dot-size, 12px);
  border-radius: 50%;
  background: #d9534f;
  cursor: pointer;
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;
}
.dot.completed {
  background: #2e7d32;
}
.dot:hover {
  transform: scale(1.15);
  box-shadow: 0 0 0 2px #90caf9;
}
.error-state {
  font-size: 0.75rem;
}
.error-text {
  opacity: 0.8;
}
::-webkit-scrollbar {
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.18);
  border-radius: 3px;
}
</style>
