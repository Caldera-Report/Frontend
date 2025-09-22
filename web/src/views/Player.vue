<template>
  <title>{{ player?.displayName + ' - Caldera Report' }}</title>
  <div class="player-hero" v-if="player">
    <div class="player-hero__banner" :style="heroStyle">
      <div class="player-hero__overlay" />
      <div class="player-hero__content">
        <div class="player-hero__identity">
          <h1 class="player-hero__name">{{ player.fullDisplayName }}</h1>
          <div class="player-hero__meta" v-if="player.displayNameCode">
            {{ playerClan?.results[0]?.group.name || 'No Clan' }}
          </div>
        </div>
        <div class="player-hero__actions">
          <v-tooltip text="Refresh reports" location="left">
            <template #activator="{ props }">
              <v-btn
                v-bind="props"
                icon="mdi-refresh"
                size="small"
                variant="flat"
                class="refresh-icon-btn hero-refresh"
                :loading="isPending"
                @click="handleRefresh"
                aria-label="Refresh player activity reports"
              />
            </template>
          </v-tooltip>
        </div>
      </div>
    </div>
  </div>
  <div class="player-tabs-wrapper" v-if="activities?.length">
    <v-tabs
      mandatory="force"
      v-model="selectedTab"
      class="flex-tabs player-tabs"
      density="comfortable"
    >
      <v-tab v-for="opType in activities" :key="opType.id">
        {{ opType.name }}
      </v-tab>
    </v-tabs>
    <div class="tab-underline" />
  </div>
  <div class="player-activities stack">
    <v-window v-model="selectedTab" class="mt-4">
      <v-window-item v-for="(opType, idx) in activities" :key="opType.id" :value="idx">
        <div class="optype-section">
          <div class="activities-grid" v-if="player?.id">
            <ActivityCard
              ref="activityCards"
              v-for="activity in sortedActivities(opType)"
              :key="activity.id"
              :image-url="'https://www.bungie.net' + activity.imageURL"
              :activity-name="activity.name"
              :activity-id="activity.id"
              :player-id="player.id"
              :ready="isInitialUpdateDone"
              @select-report="onSelectReport"
            />
          </div>
        </div>
      </v-window-item>
    </v-window>
  </div>
  <ErrorSnackbar v-model="showErrorSnack" :message="errorMessage" />
</template>

<script setup lang="ts">
import {
  useAllActivities,
  useClanForUser,
  usePlayer,
  useUpdatePlayerActivityReports,
} from '@/hooks'
import { computed, ref, watch } from 'vue'
import ErrorSnackbar from '@/components/ErrorSnackbar.vue'
import ActivityCard from '@/components/ActivityCard.vue'
import type { ActivityReportDTO, ActivityDTO } from '@/api/models'

const props = defineProps<{
  membershipId: string
}>()

type ActivityCardInstance = InstanceType<typeof ActivityCard>
const activityCards = ref<ActivityCardInstance[]>([])

const showErrorSnack = ref(false)
const errorMessage = ref('')

const selectedTab = ref(0)
const isInitialUpdateDone = ref(false)

const {
  data: activities,
  isPending: isActivitiesPending,
  isError: isActivitiesError,
} = useAllActivities()

const {
  data: player,
  isPending: isPlayerPending,
  isError: isPlayerError,
} = usePlayer(props.membershipId)

const {
  mutateAsync: updatePlayerReports,
  isPending: isUpdatePending,
  isError: isUpdateError,
  error: updateError,
} = useUpdatePlayerActivityReports()

const membershipType = computed(() => player.value?.membershipType || 0)

const {
  data: playerClan,
  isPending: isClanPending,
  isError: isClanError,
} = useClanForUser(props.membershipId, membershipType)

const isPending = computed(
  () =>
    isActivitiesPending.value ||
    isPlayerPending.value ||
    isUpdatePending.value ||
    isClanPending.value,
)
const isError = computed(
  () => isActivitiesError.value || isPlayerError.value || isUpdateError.value || isClanError.value,
)

const heroStyle = computed(() => {
  const bg = player.value?.lastPlayedCharacterBackgroundPath
  if (!bg) return {}
  return {
    backgroundImage: `url(https://www.bungie.net${bg})`,
  }
})

watch([isError, errorMessage], ([errState, msg], [prevErrState]) => {
  if (errState && msg && (errState !== prevErrState || showErrorSnack.value === false)) {
    showErrorSnack.value = true
  }
})

function onSelectReport(report: ActivityReportDTO) {
  console.log('Selected report', report)
}

function sortedActivities(opType: { activities?: ActivityDTO[] }) {
  if (!opType.activities) return []
  return [...opType.activities].sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
}

async function handleRefresh() {
  if (!player?.value?.id) return
  try {
    errorMessage.value = ''
    await updatePlayerReports(player.value.id)
    isInitialUpdateDone.value = true
  } catch (e) {
    errorMessage.value = (e as Error)?.message || 'Failed to refresh player reports'
  }
}

const unwatchAutoRefresh = watch(
  () => player.value?.id,
  async (id) => {
    if (!id) return
    try {
      errorMessage.value = ''
      await updatePlayerReports(id)
      isInitialUpdateDone.value = true
    } catch (e) {
      errorMessage.value = (e as Error)?.message || 'Failed to refresh player reports'
    } finally {
      unwatchAutoRefresh()
    }
  },
  { immediate: true },
)

watch(
  () => isUpdateError.value,
  (v) => {
    if (v && updateError.value) {
      errorMessage.value = (updateError.value as Error).message || 'Failed to refresh'
    }
  },
)
</script>

<style scoped>
.player-hero {
  margin-bottom: var(--space-8);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: #090909;
  box-shadow: var(--shadow-md);
}
.player-hero__banner {
  position: relative;
  min-height: 160px;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}
.player-hero__overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    rgba(0, 0, 0, 0.85),
    rgba(0, 0, 0, 0.55) 45%,
    rgba(0, 0, 0, 0.85)
  );
}
.player-hero__content {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-8);
  padding: var(--space-10) var(--space-12) var(--space-8);
}
.player-hero__identity {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.player-hero__name {
  font-size: 2.4rem;
  margin: 0;
  font-weight: 700;
  letter-spacing: 0.9px;
  color: var(--color-text);
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.6);
}
.player-hero__meta {
  font-size: var(--text-sm);
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--color-text-soft);
}
.player-hero__actions {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}
.hero-refresh {
  --_icon-bg: rgba(var(--color-accent-rgb) / 0.25);
}

.player-tabs-wrapper {
  margin-bottom: var(--space-4);
}
.tabs-row {
  display: flex;
  align-items: center;
  gap: var(--space-6);
}
.tab-underline {
  height: 2px;
  background: rgba(var(--color-accent-rgb) / 0.6);
  margin-top: 4px;
}

.player-tabs {
  --_tab-bg: rgba(255, 255, 255, 0.04);
  --_tab-bg-active: rgba(var(--color-accent-rgb) / 0.25);
}
.player-tabs .v-tab {
  text-transform: none;
  font-weight: 600;
  letter-spacing: 0.55px;
  font-size: 0.9rem;
  color: var(--color-text-soft);
}
.player-tabs .v-tab:hover {
  color: var(--color-text);
  background: rgba(255, 255, 255, 0.07);
}
.player-tabs .v-tab.v-tab--selected {
  color: var(--color-text);
  background: var(--_tab-bg-active);
  box-shadow: 0 0 0 1px rgba(var(--color-accent-rgb) / 0.35) inset;
}
.player-tabs .v-slide-group__container {
  gap: 4px;
}

:deep(.v-selection-control .v-label) {
  color: var(--color-text-soft);
  font-size: var(--text-sm);
}
:deep(.v-selection-control:hover .v-label) {
  color: var(--color-text);
}
:deep(.v-selection-control .v-selection-control__input) {
  --v-theme-on-surface-variant: var(--color-text-faint);
}
:deep(.v-checkbox .v-icon) {
  color: var(--color-accent);
}

.refresh-icon-btn {
  --_icon-bg: rgba(var(--color-accent-rgb) / 0.15);
  --_icon-bg-hover: rgba(var(--color-accent-rgb) / 0.28);
  --_icon-bg-active: rgba(var(--color-accent-rgb) / 0.38);
  background: var(--_icon-bg) !important;
  color: var(--color-accent) !important;
  box-shadow: 0 0 0 1px rgba(var(--color-accent-rgb) / 0.35) inset;
  transition:
    background var(--transition-fast),
    transform var(--transition-fast),
    filter var(--transition-fast);
}
.refresh-icon-btn:hover {
  background: var(--_icon-bg-hover) !important;
}
.refresh-icon-btn:active {
  background: var(--_icon-bg-active) !important;
  transform: translateY(1px);
}
.refresh-icon-btn:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
}
.refresh-icon-btn .v-icon {
  font-size: 20px;
}

.player-activities {
  gap: var(--space-10);
}

:deep(.v-window) {
  background: transparent;
}

.activities-grid {
  display: grid;
  gap: var(--space-8);
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
}

@media (max-width: 640px) {
  .activities-grid {
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  }
}
</style>
