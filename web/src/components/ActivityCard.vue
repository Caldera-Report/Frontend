<template>
  <v-card class="activity-card-new" elevation="2">
    <div class="activity-card-new__banner" :style="{ backgroundImage: `url(${imageUrl})` }">
      <div class="activity-card-new__label-row">
        <div class="activity-card-new__title">{{ activityName }}</div>
      </div>
    </div>
    <div class="activity-card-new__body">
      <v-progress-linear
        v-if="isPending || isGraphComputing"
        indeterminate
        color="primary"
        height="3"
        class="mb-1"
      />
      <div class="activity-stats-row plain">
        <div class="stat-group-left">
          <span class="stat-label">Total Clears:</span>
          <span class="stat-value strong">{{ totalClears }}</span>
        </div>
        <div class="stat-group-right">
          <router-link
            v-if="recentCompletion"
            :to="`/activityreport/${recentCompletion.instanceId}`"
            class="stat-pair"
            :title="dotTooltip(recentCompletion)"
          >
            <span class="stat-label">Recent</span>
            <span class="stat-value">{{ recentDurationFormatted }}</span>
          </router-link>
          <div v-else class="stat-pair">
            <span class="stat-label">Recent</span>
            <span class="stat-value">{{ recentDurationFormatted }}</span>
          </div>
          <div class="divider-dot"></div>
          <router-link
            v-if="fastestCompletion"
            :to="`/activityreport/${fastestCompletion.instanceId}`"
            class="stat-pair"
            :title="dotTooltip(fastestCompletion)"
          >
            <span class="stat-label">Fastest</span>
            <span class="stat-value">{{ fastestDurationFormatted }}</span>
          </router-link>
          <div v-else class="stat-pair">
            <span class="stat-label">Fastest</span>
            <span class="stat-value">{{ fastestDurationFormatted }}</span>
          </div>
          <div class="divider-dot"></div>
          <div class="stat-pair">
            <span class="stat-label">Average</span>
            <span class="stat-value">{{ averageDurationFormatted }}</span>
          </div>
        </div>
      </div>
      <div
        class="graph-shell"
        ref="graphWrapperEl"
        :class="[
          isScrollable ? 'is-scrollable' : '',
          fadeClass,
          isGraphComputing ? 'is-loading' : '',
        ]"
        :style="graphVars"
      >
        <div v-if="isGraphComputing" class="graph-skeleton" aria-live="polite">
          <div class="skeleton-bar" v-for="n in 5" :key="n" />
          <span class="skeleton-label">Rendering graph…</span>
        </div>
        <div
          class="graph"
          ref="graphEl"
          :style="{
            width: displayGraphWidth + 'px',
            height: graphHeight + 'px',
          }"
        >
          <div class="graph__avg-line"></div>
          <canvas
            ref="canvasEl"
            class="graph-canvas"
            :class="{ 'is-hovering': !!hoverState }"
            :width="canvasPixelWidth"
            :height="canvasPixelHeight"
            :style="{ width: displayGraphWidth + 'px', height: graphHeight + 'px' }"
          ></canvas>
        </div>
      </div>
      <teleport to="body">
        <div
          v-if="hoverState"
          class="graph-tooltip graph-tooltip-global"
          :style="{ left: hoverState.globalX + 'px', top: hoverState.globalY + 'px' }"
          role="tooltip"
        >
          {{ hoverState.text }}
        </div>
      </teleport>
    </div>
  </v-card>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, nextTick, onBeforeUnmount } from 'vue'
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
  data: reportList,
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
  [...(reportList?.value?.reports ?? [])].sort(
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

const fastestCompletion = computed(() => reportList.value?.best || undefined)
const fastestDurationFormatted = computed(() =>
  formatDurationDetailed(parseDuration(fastestCompletion.value?.duration)),
)
const averageDurationFormatted = computed(() => {
  const raw = reportList.value?.average
  if (!raw) return '-'
  return formatDurationDetailed(parseDuration(raw))
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
  window.location.href = `/activityreport/${r.instanceId}`
}

const graphEl = ref<HTMLElement | null>(null)
const graphWrapperEl = ref<HTMLElement | null>(null)
const canvasEl = ref<HTMLCanvasElement | null>(null)
const devicePixelRatioRef = ref(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1)
const hoverState = ref<null | {
  x: number
  y: number
  globalX: number
  globalY: number
  text: string
  r: ActivityReportDTO
}>(null)

const durationDomain = computed(() => {
  const source = reportsSorted.value
  if (!source.length) return { min: 0, max: 0, avg: 0 }
  const min = Math.min(...source.map((r) => parseDuration(r.duration)))
  const max = Math.max(...source.map((r) => parseDuration(r.duration)))
  const avgSource = completedReports.value.length ? completedReports.value : source
  const avg = avgSource.reduce((s, r) => s + parseDuration(r.duration), 0) / avgSource.length || 0
  return { min, max, avg }
})

const graphHeight = 56
const pointRadius = 7
const verticalPadding = 10
const pointSpacing = 22
const leftOffset = pointRadius + 10
const rightOffset = pointRadius + 5
const baseGraphWidth = computed(() =>
  reportsSorted.value.length
    ? leftOffset + (reportsSorted.value.length - 1) * pointSpacing + rightOffset
    : 0,
)
const wrapperWidth = ref(0)
// Width occupied by the plotted points themselves (does not stretch)
const graphContentWidth = computed(() => baseGraphWidth.value)
// Display width: we allow the average line (and canvas) to extend to at least the wrapper width
// while keeping the original point spacing unscaled. Points keep their x based on graphContentWidth.
const displayGraphWidth = computed(() => {
  if (!wrapperWidth.value) return graphContentWidth.value
  return Math.max(graphContentWidth.value, wrapperWidth.value)
})

const maxDeviation = computed(() => {
  if (!reportsSorted.value.length) return 0
  const avg = durationDomain.value.avg
  const deviations = reportsSorted.value.map((r) => Math.abs(parseDuration(r.duration) - avg))
  return Math.max(...deviations, 1)
})

const pointsPlottable = computed(() =>
  reportsSorted.value.map((r, idx) => {
    const duration = parseDuration(r.duration)
    const avg = durationDomain.value.avg || 0
    const deviation = duration - avg
    const normalized = deviation / (maxDeviation.value || 1)
    const centerY = graphHeight / 2
    const amplitude = graphHeight / 2 - verticalPadding
    const y = centerY + normalized * amplitude
    const x = leftOffset + idx * pointSpacing
    return { r, x, y, duration, deviation, isCompleted: r.completed }
  }),
)

const canvasPixelWidth = computed(() =>
  Math.max(1, Math.floor(displayGraphWidth.value * devicePixelRatioRef.value)),
)
const canvasPixelHeight = computed(() =>
  Math.max(1, Math.floor(graphHeight * devicePixelRatioRef.value)),
)

function drawCanvas() {
  const canvas = canvasEl.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const dpr = devicePixelRatioRef.value
  ctx.reset?.()
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.save()
  if (dpr !== 1) ctx.scale(dpr, dpr)
  const pts = pointsPlottable.value
  if (!pts.length) {
    ctx.restore()
    return
  }
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]
    ctx.beginPath()
    ctx.arc(p.x, p.y, pointRadius, 0, Math.PI * 2)
    ctx.fillStyle = p.isCompleted ? '#27ae60' : '#c0392b'
    ctx.fill()
  }
  if (hoverState.value) {
    const p = hoverState.value
    ctx.beginPath()
    ctx.arc(p.x, p.y, pointRadius + 3, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(p.x, p.y, pointRadius, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255,255,255,0.15)'
    ctx.fill()
  }
  ctx.restore()
}

interface PlotPoint {
  r: ActivityReportDTO
  x: number
  y: number
  duration: number
  deviation: number
  isCompleted: boolean
}
function findPointAt(x: number, y: number) {
  const pts: PlotPoint[] = pointsPlottable.value as PlotPoint[]
  const r = pointRadius + 5
  let hit: PlotPoint | null = null
  let minDist = Infinity
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]
    const dx = x - p.x
    const dy = y - p.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist <= r && dist < minDist) {
      hit = p
      minDist = dist
    }
  }
  return hit
}

function handlePointerMove(ev: MouseEvent) {
  const canvas = canvasEl.value
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  const x = ev.clientX - rect.left
  const y = ev.clientY - rect.top
  const found = findPointAt(x, y)
  if (found) {
    hoverState.value = {
      x: found.x,
      y: found.y,
      globalX: rect.left + found.x,
      globalY: rect.top + found.y - (pointRadius + 4),
      text: dotTooltip(found.r),
      r: found.r,
    }
  } else {
    hoverState.value = null
  }
  drawCanvas()
}

function handlePointerLeave() {
  hoverState.value = null
  drawCanvas()
}

function handleClick() {
  if (hoverState.value) onSelect(hoverState.value.r)
}

const graphVars = computed(() => ({
  '--graph-height': graphHeight + 'px',
}))

const isScrollable = ref(false)
const atLeftEdge = ref(true)
const atRightEdge = ref(true)
const fadeClass = computed(() => {
  if (!isScrollable.value) return ''
  if (atLeftEdge.value && atRightEdge.value) return ''
  if (atLeftEdge.value) return 'fade-right'
  if (atRightEdge.value) return 'fade-left'
  return 'fade-both'
})

function updateScrollable() {
  if (!graphWrapperEl.value) return
  wrapperWidth.value = graphWrapperEl.value.clientWidth
  const tolerance = 2
  isScrollable.value = graphContentWidth.value > wrapperWidth.value + tolerance
  if (!isScrollable.value) {
    graphWrapperEl.value.scrollLeft = 0
  }
  updateEdgeState()
}

function updateEdgeState() {
  if (!graphWrapperEl.value) return
  const el = graphWrapperEl.value
  const maxScroll = el.scrollWidth - el.clientWidth
  const sl = el.scrollLeft
  atLeftEdge.value = sl <= 1
  atRightEdge.value = maxScroll - sl <= 1
}

async function scrollToRight() {
  await nextTick()
  if (!graphWrapperEl.value) return
  graphWrapperEl.value.scrollLeft = graphWrapperEl.value.scrollWidth
}

const isGraphComputing = ref(false)

function beginGraphCompute() {
  isGraphComputing.value = true
  nextTick(() => {
    requestAnimationFrame(() => {
      isGraphComputing.value = false
      drawCanvas()
    })
  })
}

watch(pointsPlottable, async () => {
  beginGraphCompute()
  await nextTick()
  updateScrollable()
  scrollToRight()
  requestAnimationFrame(drawCanvas)
})

onMounted(async () => {
  beginGraphCompute()
  updateScrollable()
  scrollToRight()
  const c = canvasEl.value
  c?.addEventListener('mousemove', handlePointerMove)
  c?.addEventListener('mouseleave', handlePointerLeave)
  c?.addEventListener('click', handleClick)
  graphWrapperEl.value?.addEventListener('scroll', updateEdgeState, { passive: true })
  window.addEventListener('resize', updateScrollable)
})

watch(
  () => props.ready,
  async (val) => {
    if (val) {
      await nextTick()
      beginGraphCompute()
      updateScrollable()
      scrollToRight()
    }
  },
)

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateScrollable)
  graphWrapperEl.value?.removeEventListener('scroll', updateEdgeState)
  const c = canvasEl.value
  c?.removeEventListener('mousemove', handlePointerMove)
  c?.removeEventListener('mouseleave', handlePointerLeave)
  c?.removeEventListener('click', handleClick)
})
</script>

<style scoped>
.activity-card-new {
  background: var(--color-bg-alt);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-sm);
}
.activity-card-new__banner {
  height: 170px;
  position: relative;
  background-size: cover;
  background-position: center;
}
.activity-card-new__banner::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.85) 88%);
}
.activity-card-new__label-row {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: var(--space-8) var(--space-8) var(--space-6);
  z-index: 2;
}
.activity-card-new__title {
  font-size: 1.05rem;
  font-weight: 600;
  letter-spacing: 0.5px;
  line-height: 1.1;
  text-transform: uppercase;
  color: var(--color-text);
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.6);
}
.activity-card-new__body {
  padding: 0.75rem 0.85rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.activity-stats-row.plain {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  align-items: baseline;
  padding: 2px 4px;
  font-size: 0.8rem;
  letter-spacing: 0.3px;
}
.stat-group-left {
  display: flex;
  gap: 0.4rem;
  align-items: baseline;
}
.stat-group-right {
  display: flex;
  gap: 0.85rem;
  flex-wrap: wrap;
  align-items: baseline;
}
.stat-label {
  text-transform: uppercase;
  opacity: 0.6;
  font-size: 0.65rem;
  letter-spacing: 0.6px;
}
.stat-value {
  font-weight: 600;
}
.stat-value.strong {
  font-size: 1.1rem;
}
.stat-pair {
  display: flex;
  flex-direction: column;
  gap: 0;
}
.divider-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--color-border);
  align-self: center;
  opacity: 0.55;
  margin-top: 2px;
}
.graph-shell {
  position: relative;
  overflow-x: auto;
  overflow-y: hidden;
  width: 100%;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0.01));
  padding: 6px 4px;
  scrollbar-width: thin;
}
.graph-shell.is-loading {
  min-height: var(--graph-height, 76px);
}
.graph-shell:not(.is-scrollable) {
  overflow-x: hidden;
}
.graph-shell::-webkit-scrollbar {
  height: 8px;
}
.graph-shell::-webkit-scrollbar-track {
  background: transparent;
}
.graph-shell::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 4px;
}
.graph-shell::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}
.graph-shell.is-scrollable {
  --fade-size: 28px;
}
.graph-shell.fade-both.is-scrollable {
  mask-image: linear-gradient(
    to right,
    transparent 0,
    #000 var(--fade-size),
    #000 calc(100% - var(--fade-size)),
    transparent 100%
  );
}
.graph-shell.fade-right.is-scrollable {
  mask-image: linear-gradient(
    to right,
    #000 0,
    #000 calc(100% - var(--fade-size)),
    transparent 100%
  );
}
.graph-shell.fade-left.is-scrollable {
  mask-image: linear-gradient(to right, transparent 0, #000 var(--fade-size), #000 100%);
}
.graph {
  position: relative;
}
.graph__avg-line {
  position: absolute;
  left: 0;
  top: 50%;
  width: 100%;
  height: 0;
  border-top: 2px solid var(--color-border-strong, rgba(255, 255, 255, 0.45));
  pointer-events: none;
  z-index: 1;
}
.graph__point {
  z-index: 3;
  position: absolute;
  top: 0;
  left: 0;
  border-radius: 50%;
  background: var(--color-accent, #888);
  cursor: pointer;
  box-shadow:
    0 0 0 1px #000,
    0 0 0 2px rgba(0, 0, 0, 0.4);
  transition:
    transform 0.15s ease,
    background-color 0.2s;
}
.graph__point.is-completed {
  background: #27ae60;
}
.graph__point.is-incomplete {
  background: #c0392b;
}
.graph__point:hover {
  z-index: 3;
  box-shadow:
    0 0 0 1px #000,
    0 0 0 3px rgba(0, 0, 0, 0.5);
}
.graph__point::after {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.05);
  pointer-events: none;
  opacity: 0;
  transform: scale(0.6);
  transition:
    opacity 0.18s ease,
    transform 0.18s ease,
    border-color 0.25s ease;
}
.graph__point:hover::after,
.graph__point:focus-visible::after {
  opacity: 1;
  transform: scale(1);
  border-color: rgba(255, 255, 255, 0.4);
}
.graph__point:focus-visible {
  outline: none;
}
.graph-canvas {
  position: relative;
  display: block;
  z-index: 2;
}
.graph-canvas.is-hovering {
  cursor: pointer;
}
.graph-hit-anchor {
  position: absolute;
  transform: translate(-50%, -50%);
  width: 1px;
  height: 1px;
  z-index: 3;
}
.graph-point-tooltip {
  z-index: 4;
}
.graph-shell::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.4);
}
.graph-tooltip {
  position: absolute;
  background: #0c0f14;
  color: #f5f8fa;
  font-size: 0.65rem;
  line-height: 1.2;
  padding: 3px 6px 4px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  transform: translate(-50%, -100%);
  pointer-events: none;
  white-space: nowrap;
  z-index: 7;
  box-shadow:
    0 4px 10px -2px rgba(0, 0, 0, 0.55),
    0 0 0 1px rgba(255, 255, 255, 0.04);
}
.graph-tooltip-global {
  position: fixed;
}
:deep(.graph-point-tooltip) {
  background: #0c0f14 !important;
  color: #f5f8fa !important;
  font-size: 0.65rem !important;
  line-height: 1.25 !important;
  padding: 4px 6px 5px !important;
  border: 1px solid rgba(255, 255, 255, 0.15) !important;
  border-radius: 4px !important;
  box-shadow:
    0 4px 10px -2px rgba(0, 0, 0, 0.55),
    0 0 0 1px rgba(255, 255, 255, 0.04) !important;
  letter-spacing: 0.3px;
}
:deep(.graph-point-tooltip .v-overlay__content) {
  padding: 0 !important;
}
.error-state {
  background: rgba(231, 76, 60, 0.1);
  border: 1px solid #e74c3c33;
  padding: 4px 6px;
  border-radius: 6px;
  font-size: 0.75rem;
  gap: 0.5rem;
  margin-bottom: 4px;
}
.error-text {
  color: #ffb4ac;
}
@media (max-width: 600px) {
  .stat-group-right {
    gap: 0.65rem;
  }
  .activity-card-new__banner {
    height: 140px;
  }
  .activity-stats-row {
    flex-direction: column;
  }
}
</style>
