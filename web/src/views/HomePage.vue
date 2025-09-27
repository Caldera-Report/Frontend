<template>
  <div class="home">
    <section class="hero minimal">
      <div class="hero-inner">
        <div class="branding">
          <h1>Caldera Report</h1>
          <p class="tagline">
            Raid & dungeon insights, player stats, and activity analytics in one place.
          </p>
          <div class="cta-row">
            <v-btn
              color="primary"
              size="large"
              elevation="2"
              @click="
                $router.push({
                  name: 'Leaderboard',
                  params: { type: 'completions', activityId: '0' },
                })
              "
              >View All Leaderboards</v-btn
            >
          </div>
          <div class="helper">Search a Guardian above or pick an activity below to dive in.</div>
        </div>
      </div>
    </section>

    <section id="explore" class="activities">
      <div class="section-head">
        <div class="head-text"><h2>Activity Leaderboards</h2></div>
        <div class="bulk-controls" v-if="activities && activities.length">
          <button type="button" class="bulk-btn" @click="openAll" :disabled="allOpen">
            Expand All
          </button>
          <button type="button" class="bulk-btn" @click="closeAll" :disabled="!anyOpen">
            Collapse All
          </button>
        </div>
      </div>
      <div v-if="isActivitiesPending" class="loading-wrap">
        <v-progress-circular indeterminate size="32" width="3" color="primary" />
      </div>
      <div v-else-if="isActivitiesError" class="error-wrap">
        <v-alert
          type="error"
          variant="tonal"
          density="comfortable"
          title="Failed to load activities"
        >
          <template #text>
            {{ activitiesError?.message || 'Unable to load activities at this time.' }}
          </template>
        </v-alert>
      </div>
      <div v-else class="op-panels">
        <div
          v-for="(op, idx) in activities || []"
          :key="op.id"
          class="op-panel"
          :class="['variant-' + (idx % 4), { open: isOpen(op.id) }]"
        >
          <button
            class="panel-header"
            type="button"
            :aria-expanded="isOpen(op.id)"
            @click="togglePanel(op.id)"
          >
            <h3 class="panel-title">{{ op.name }}</h3>
            <span class="chevron" aria-hidden="true" />
          </button>
          <transition
            name="collapse"
            @enter="onEnter"
            @after-enter="onAfterEnter"
            @leave="onLeave"
            @after-leave="onAfterLeave"
          >
            <div v-show="isOpen(op.id)" class="panel-body">
              <div class="panel-body-inner">
                <ul class="activity-list" role="list">
                  <li
                    v-for="act in (op.activities || []).slice().sort((a, b) => a.index - b.index)"
                    :key="act.id"
                  >
                    <router-link
                      class="activity-link"
                      :to="{
                        name: 'Leaderboard',
                        params: { type: 'completions', activityId: act.id },
                      }"
                    >
                      {{ act.name }}
                    </router-link>
                  </li>
                </ul>
              </div>
            </div>
          </transition>
        </div>
      </div>
    </section>

    <section class="highlights">
      <div class="highlight-grid">
        <div class="highlight">
          <h3>Precision Data</h3>
          <p>Curated activity metrics with fast, cached lookups backed by the Destiny API.</p>
        </div>
        <div class="highlight">
          <h3>Smart Search</h3>
          <p>Recent history & fuzzy matching help you find Guardians instantly.</p>
        </div>
        <div class="highlight">
          <h3>Clean UI</h3>
          <p>Low-noise presentation so the important stats are always front and center.</p>
        </div>
        <div class="highlight">
          <h3>Roadmap</h3>
          <p>More analytics, filters, and comparative reporting on the way.</p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAllActivities } from '@/hooks'

const {
  data: activities,
  isPending: isActivitiesPending,
  isError: isActivitiesError,
  error: activitiesError,
} = useAllActivities()

const openPanels = ref<Set<number>>(new Set())

function togglePanel(id: number) {
  const set = new Set(openPanels.value)
  if (set.has(id)) set.delete(id)
  else set.add(id)
  openPanels.value = set
}
function isOpen(id: number) {
  return openPanels.value.has(id)
}

function onEnter(el: Element) {
  const elHtml = el as HTMLElement
  elHtml.style.height = '0px'
  elHtml.style.opacity = '0'
  void elHtml.offsetHeight
  const target = elHtml.scrollHeight
  elHtml.style.transition = 'height .32s ease, opacity .28s ease'
  elHtml.style.height = target + 'px'
  elHtml.style.opacity = '1'
}
function onAfterEnter(el: Element) {
  const elHtml = el as HTMLElement
  elHtml.style.height = 'auto'
  elHtml.style.transition = ''
}
function onLeave(el: Element) {
  const elHtml = el as HTMLElement
  elHtml.style.height = elHtml.scrollHeight + 'px'
  elHtml.style.opacity = '1'
  void elHtml.offsetHeight
  elHtml.style.transition = 'height .3s ease, opacity .26s ease'
  elHtml.style.height = '0px'
  elHtml.style.opacity = '0'
}
function onAfterLeave(el: Element) {
  const elHtml = el as HTMLElement
  elHtml.style.transition = ''
}

const allOpen = computed(() => {
  if (!activities?.value?.length) return false
  return activities.value.every((op) => openPanels.value.has(op.id))
})
const anyOpen = computed(() => openPanels.value.size > 0)
function openAll() {
  if (!activities?.value) return
  const set = new Set<number>()
  for (const op of activities.value) set.add(op.id)
  openPanels.value = set
}
function closeAll() {
  openPanels.value = new Set()
}
</script>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  gap: 4rem;
}
.home {
  position: relative;
}
.home::before {
  content: '';
  position: fixed;
  top: -80px;
  left: 50%;
  transform: translateX(-50%);
  width: 640px; /* reduced to avoid scaling artifact */
  height: 640px;
  pointer-events: none;
  background:
    radial-gradient(circle at 50% 30%, rgba(var(--v-theme-primary), 0.12), transparent 62%),
    url(/Logo.png) center/320px auto no-repeat; /* show logo closer to native clarity */
  opacity: 0.2; /* slightly softer since smaller */
  mix-blend-mode: luminosity;
  filter: saturate(0) brightness(1.05);
  z-index: 0;
}

.hero {
  position: relative;
  padding: clamp(3.5rem, 10vh, 7rem) 1.5rem 4rem;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  z-index: 1;
}
.hero-inner {
  width: 100%;
  max-width: 980px;
  position: relative;
}
.branding {
  text-align: center;
}
.branding h1 {
  font-size: clamp(2.3rem, 6.5vw, 3.2rem);
  letter-spacing: 0.5px;
  margin: 0 0 0.75rem;
}
.tagline {
  font-size: 1.02rem;
  opacity: 0.88;
  margin: 0 auto 1.5rem;
  max-width: 640px;
}
.cta-row {
  display: flex;
  gap: 0.9rem;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 0.8rem;
}
.helper {
  font-size: 0.7rem;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  opacity: 0.5;
}

.activities {
  padding: 0 1.5rem 1rem;
  position: relative;
  z-index: 1;
}
.section-head {
  max-width: 1220px; /* match op-panels width */
  margin: 0 auto 1.25rem;
  padding: 0; /* remove side padding to align edges */
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}
.section-head h2 {
  font-size: 1.5rem;
  font-weight: 600;
  letter-spacing: 0.5px;
  margin: 0;
}
.loading-wrap,
.error-wrap {
  max-width: 1120px;
  margin: 0 auto;
  padding: 2rem 0;
  display: flex;
  justify-content: center;
}
.op-panels {
  max-width: 1220px;
  margin: 0 auto;
  display: grid;
  gap: 1.15rem 1.15rem;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  align-items: start;
}
.op-panel {
  position: relative;
  border: 1px solid rgba(var(--v-theme-primary), 0.25);
  border-radius: 12px;
  background: linear-gradient(
    145deg,
    rgba(var(--v-theme-surface), 0.9),
    rgba(var(--v-theme-surface), 0.75)
  );
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition:
    border-color 0.35s,
    box-shadow 0.35s,
    transform 0.35s,
    background 0.6s;
}
.op-panel::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(var(--panel-accent, rgba(var(--v-theme-primary), 0.4)), transparent);
  opacity: 0.12;
  pointer-events: none;
  mix-blend-mode: overlay;
  transition: opacity 0.4s;
}
.op-panel.open {
  box-shadow:
    0 6px 20px -8px rgba(0, 0, 0, 0.55),
    0 0 0 1px rgba(var(--v-theme-primary), 0.35) inset;
  border-color: rgba(var(--v-theme-primary), 0.55);
}
.op-panel:hover {
  border-color: rgba(var(--v-theme-primary), 0.5);
  transform: translateY(-3px);
}
.op-panel:hover::before {
  opacity: 0.22;
}
.panel-header {
  all: unset;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.75rem 0.95rem;
  position: relative;
  background: linear-gradient(
    90deg,
    var(--panel-accent, rgba(var(--v-theme-primary), 0.5)) 0%,
    transparent 75%
  );
  border-bottom: 1px solid rgba(var(--v-theme-primary), 0.25);
}
.panel-header:focus-visible {
  outline: 2px solid rgba(var(--v-theme-primary), 0.8);
  outline-offset: 2px;
}
.panel-title {
  margin: 0;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 1.1px;
  text-transform: uppercase;
  color: #fff;
  line-height: 1.1;
}
.chevron {
  width: 14px;
  height: 14px;
  position: relative;
  flex-shrink: 0;
}
.chevron::before,
.chevron::after {
  content: '';
  position: absolute;
  inset: 0;
  margin: auto;
  width: 10px;
  height: 10px;
  border-right: 2px solid rgba(255, 255, 255, 0.8);
  border-bottom: 2px solid rgba(255, 255, 255, 0.8);
  transform: rotate(-45deg) translateY(-2px);
  transition: transform 0.35s;
}
.op-panel.open .chevron::before,
.op-panel.open .chevron::after {
  transform: rotate(45deg) translateY(2px);
}
.panel-body {
  padding: 0;
  animation: panelFade 0.55s ease;
}
.panel-body-inner {
  padding: 0.4rem 0.4rem 0.75rem;
}
@keyframes panelFade {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.activity-list {
  list-style: none;
  margin: 0;
  padding: 0.25rem 0.4rem 0.4rem;
  display: flex;
  flex-direction: column;
  gap: 0.05rem;
  overflow: auto;
  scrollbar-width: thin;
  max-height: 300px;
}
.activity-list li {
  margin: 0;
  padding: 0;
}
.activity-link {
  display: block;
  padding: 0.38rem 0.55rem 0.38rem 1rem;
  border-radius: 6px;
  font-size: 0.74rem;
  letter-spacing: 0.45px;
  text-decoration: none;
  color: rgba(var(--v-theme-on-surface), 0.78);
  position: relative;
  transition:
    background 0.22s,
    color 0.22s,
    transform 0.25s;
  font-weight: 500;
  line-height: 1.05;
}
.activity-link::before {
  content: '';
  position: absolute;
  left: 0.55rem;
  top: 50%;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(var(--v-theme-primary), 0.55);
  transform: translateY(-50%) scale(0.55);
  transition:
    background 0.25s,
    transform 0.25s;
}
.activity-link:hover {
  background: rgba(var(--v-theme-primary), 0.2);
  color: #fff;
  transform: translateX(2px);
}
.activity-link:hover::before {
  background: rgba(var(--v-theme-primary), 0.95);
  transform: translateY(-50%) scale(1);
}
.activity-link:active {
  background: rgba(var(--v-theme-primary), 0.28);
}
.activity-list::-webkit-scrollbar {
  width: 8px;
}
.activity-list::-webkit-scrollbar-track {
  background: transparent;
}
.activity-list::-webkit-scrollbar-thumb {
  background: linear-gradient(
    180deg,
    rgba(var(--v-theme-primary), 0.5),
    rgba(var(--v-theme-primary), 0.15)
  );
  border-radius: 20px;
}
.activity-list::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(
    180deg,
    rgba(var(--v-theme-primary), 0.75),
    rgba(var(--v-theme-primary), 0.28)
  );
}

/* Variant accents */
.op-panel.variant-0 {
  --panel-accent: linear-gradient(
    90deg,
    rgba(var(--v-theme-primary), 0.55),
    rgba(var(--v-theme-primary), 0)
  );
}
.op-panel.variant-1 {
  --panel-accent: linear-gradient(90deg, rgba(255, 190, 90, 0.55), rgba(255, 190, 90, 0));
}
.op-panel.variant-2 {
  --panel-accent: linear-gradient(90deg, rgba(120, 170, 255, 0.55), rgba(120, 170, 255, 0));
}
.op-panel.variant-3 {
  --panel-accent: linear-gradient(90deg, rgba(180, 110, 255, 0.55), rgba(180, 110, 255, 0));
}

/* Collapse transition */
.collapse-enter-active,
.collapse-leave-active {
  overflow: hidden;
}
.collapse-enter-from,
.collapse-leave-to {
  opacity: 0;
}
.collapse-enter-to,
.collapse-leave-from {
  opacity: 1;
}

.bulk-controls {
  display: flex;
  gap: 0.5rem;
}
.bulk-btn {
  background: rgba(var(--v-theme-primary), 0.15);
  border: 1px solid rgba(var(--v-theme-primary), 0.35);
  color: rgba(var(--v-theme-on-surface), 0.75);
  font-size: 0.65rem;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  padding: 0.45rem 0.7rem 0.43rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition:
    background 0.25s,
    color 0.25s,
    border-color 0.25s;
}
.bulk-btn:hover:not(:disabled) {
  background: rgba(var(--v-theme-primary), 0.35);
  color: #fff;
}
.bulk-btn:disabled {
  opacity: 0.35;
  cursor: default;
}

.highlights {
  display: none;
}

@media (max-width: 640px) {
  .feature-card {
    padding: 1rem 1rem 1.1rem;
  }
  .feature-card h3 {
    font-size: 1rem;
  }
  .branding h1 {
    font-size: 2.6rem;
  }
  .tagline {
    font-size: 0.95rem;
  }
  .hero {
    padding-top: 3.25rem;
  }
}
</style>
