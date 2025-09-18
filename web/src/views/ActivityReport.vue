<template>
  <div>
    <h1>Activity Report for ID: {{ instanceId }}</h1>
    <div v-if="isPending">Loading...</div>
    <div v-else-if="isError">Error loading report: {{ error?.message }}</div>
    <div v-else>
      <div v-if="report">
        <pre>{{ JSON.stringify(report, null, 2) }}</pre>
      </div>
      <div v-else>No report data available.</div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { useActivityReport } from '@/hooks'

const props = defineProps<{
  instanceId: string
}>()
const { instanceId } = props
const { data: report, isPending, isError, error } = useActivityReport(instanceId)
</script>
