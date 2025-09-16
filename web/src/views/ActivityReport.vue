<template>
  <div>
    <h1>Activity Report for ID: {{ instanceId }}</h1>
  </div>
</template>
<script setup lang="ts">
import { Destiny2 } from 'bungie-api-ts'

const props = defineProps<{
  instanceId: string
}>()
</script>
