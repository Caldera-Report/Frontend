import { ref, computed } from 'vue'
import { HttpError } from '@/api/http/httpClient'

interface GlobalErrorState {
  visible: boolean
  message: string
  lastError: unknown | null
}

const state: GlobalErrorState = {
  visible: false,
  message: '',
  lastError: null,
}

const visibleRef = ref(state.visible)
const messageRef = ref(state.message)
const lastErrorRef = ref<unknown | null>(state.lastError)

function extractMessage(err: unknown): string {
  if (!err) return 'Unknown error'
  if (typeof err === 'string') return err
  if (err instanceof HttpError) {
    switch (err.status) {
      case 404:
        return 'Requested resource not found.'
      case 500:
        return 'Server error. Please try again later.'
      case 401:
        return 'Not authorized.'
      case 429:
        return 'Too many requests. Slow down a bit.'
    }
    return err.message || `HTTP error ${err.status}`
  }
  if (err instanceof Error)
    return err.message || (err.name ? `${err.name} error` : 'Error occurred')
  try {
    return JSON.stringify(err)
  } catch {
    return 'Error occurred'
  }
}

export function showGlobalError(err: unknown, overrideMessage?: string) {
  lastErrorRef.value = err
  messageRef.value = overrideMessage || extractMessage(err)
  visibleRef.value = true
}

export function clearGlobalError() {
  visibleRef.value = false
}

export function useGlobalError() {
  return {
    visible: visibleRef,
    message: computed(() => messageRef.value),
    lastError: computed(() => lastErrorRef.value),
    show: showGlobalError,
    clear: clearGlobalError,
    handle: (err: unknown, overrideMessage?: string) => {
      showGlobalError(err, overrideMessage)
    },
  }
}
