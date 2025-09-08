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
              v-for="activity in flatActivities(opType)"
              :key="activity.id"
              :image-url="'https://www.bungie.net' + activity.imageURL"
              :activity-name="activity.name"
              :activity-id="activity.id"
              :player-id="player.id"
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
import { useAllActivities, usePlayer } from '@/hooks'
import { computed, ref, watch } from 'vue'
import ErrorSnackbar from '@/components/ErrorSnackbar.vue'
import ActivityCard from '@/components/ActivityCard.vue'
import type { ActivityReportDTO } from '@/api/models'

const props = defineProps<{
  membershipType: number
  membershipId: string
}>()

type ActivityCardInstance = InstanceType<typeof ActivityCard>
const activityCards = ref<ActivityCardInstance[]>([])

const showErrorSnack = ref(false)
const errorMessage = ref('')

const selectedTab = ref(0)

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

const isPending = computed(() => isActivitiesPending.value || isPlayerPending.value)
const isError = computed(() => isActivitiesError.value || isPlayerError.value)
const error = computed(() => activitiesError.value || playerError.value)

watch([isError, errorMessage], ([errState, msg], [prevErrState]) => {
  if (errState && msg && (errState !== prevErrState || showErrorSnack.value === false)) {
    showErrorSnack.value = true
  }
})

function onSelectReport(report: ActivityReportDTO) {
  // Placeholder for future interaction (e.g., open dialog). For now it's a no-op.
  console.log('Selected report', report)
}

function flatActivities(opType: any) {
  if (!opType?.activityTypes) return []
  const result: any[] = []
  for (const at of opType.activityTypes) {
    if (at.activities) result.push(...at.activities)
  }
  return result
}

function handleRefresh() {
  for (const c of activityCards.value) {
    c?.requestRefresh?.()
  }
}
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
