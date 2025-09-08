<template>
  <v-snackbar
    v-model="internalModel"
    :color="color"
    :location="location"
    :timeout="timeout"
    :elevation="elevation"
    :multi-line="isMultiLine"
    :close-on-content-click="closeOnContentClick"
    :close-delay="closeDelay"
  >
    {{ message }}
  </v-snackbar>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type SnackbarLocation =
  | 'top'
  | 'bottom'
  | 'start'
  | 'end'
  | 'left'
  | 'right'
  | 'top left'
  | 'top right'
  | 'bottom left'
  | 'bottom right'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    message: string
    color?: string
    timeout?: number
    elevation?: number | string
    location?: SnackbarLocation
    closeDelay?: number | string
    closeOnContentClick?: boolean
  }>(),
  {
    color: 'error',
    timeout: 5000,
    elevation: 4,
    location: 'top',
    closeDelay: 5000,
    closeOnContentClick: true,
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const internalModel = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v),
})

const isMultiLine = computed(() => props.message.length > 60)
</script>

<style scoped></style>
