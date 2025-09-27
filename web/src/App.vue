<script setup lang="ts">
import AppHeader from '@/components/AppHeader.vue'
import AppFooter from '@/components/AppFooter.vue'
import ErrorSnackbar from '@/components/ErrorSnackbar.vue'
import { useGlobalError } from '@/hooks/useGlobalError'

const { visible, message, clear } = useGlobalError()

function onVisibilityChange(v: boolean) {
  if (!v) clear()
}
</script>

<template>
  <v-app>
    <div id="app" class="app-shell">
      <AppHeader />
      <main class="page-shell fade-in main-shell">
        <router-view />
      </main>
      <AppFooter />
      <ErrorSnackbar
        :model-value="visible"
        :message="message"
        @update:model-value="onVisibilityChange"
      />
    </div>
  </v-app>
</template>

<style scoped></style>
