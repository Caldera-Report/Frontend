<template>
  <title>{{ player?.displayName + ' - Caldera Report' }}</title>
  <div class="player-activities">
    <v-progress-linear v-if="isPending" indeterminate color="primary" height="4" class="mb-2" />
    <h1>{{ player?.fullDisplayName }}</h1>
    <div class="tabs-row">
      <v-tabs mandatory="force" v-model="selectedTab" class="flex-tabs">
        <v-tab v-for="opType in activities" :key="opType.id">
          {{ opType.name }}
        </v-tab>
      </v-tabs>
      <v-btn
        size="small"
        variant="tonal"
        color="primary"
        class="ml-4 refresh-btn"
        :loading="isPending"
        @click="handleRefresh"
      >
        Refresh
      </v-btn>
    </div>
    <v-window v-model="selectedTab" class="mt-4">
      <v-window-item v-for="(opType, idx) in activities" :key="opType.id" :value="idx">
        <div class="optype-section">
          <div class="cards" v-if="player?.id">
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
import { useAllActivities, usePlayer, useUpdatePlayerActivityReports } from '@/hooks'
import { computed, ref, watch } from 'vue'
import ErrorSnackbar from '@/components/ErrorSnackbar.vue'
import ActivityCard from '@/components/ActivityCard.vue'
import type { ActivityReportDTO, ActivityDTO } from '@/api/models'

const props = defineProps<{
  membershipId: string
  membershipType: number
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
  error: activitiesError,
} = useAllActivities()

const {
  data: player,
  isPending: isPlayerPending,
  isError: isPlayerError,
  error: playerError,
} = usePlayer(props.membershipId, props.membershipType)

const {
  mutateAsync: updatePlayerReports,
  isPending: isUpdatePending,
  isError: isUpdateError,
  error: updateError,
} = useUpdatePlayerActivityReports()

const isPending = computed(
  () => isActivitiesPending.value || isPlayerPending.value || isUpdatePending.value,
)
const isError = computed(
  () => isActivitiesError.value || isPlayerError.value || isUpdateError.value,
)
const error = computed(() => activitiesError.value || playerError.value || updateError.value)

watch([isError, errorMessage], ([errState, msg], [prevErrState]) => {
  if (errState && msg && (errState !== prevErrState || showErrorSnack.value === false)) {
    showErrorSnack.value = true
  }
})

function onSelectReport(report: ActivityReportDTO) {
  // Placeholder for future interaction (e.g., open dialog). For now it's a no-op.
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
.player-activities {
  padding: 16px;
}
.tabs-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
}
.flex-tabs {
  flex: 1 1 auto;
}
.optype-section {
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.activity-type-name {
  font-size: 1rem;
  font-weight: 600;
  margin: 8px 4px 4px;
  opacity: 0.85;
  text-transform: uppercase;
  letter-spacing: 1px;
}
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(315px, 1fr));
  gap: 18px;
}
</style>
