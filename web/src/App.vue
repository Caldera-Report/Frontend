<script setup lang="ts">
import AppHeader from '@/components/AppHeader.vue'
</script>

<template>
  <v-app>
    <div id="app" class="app-shell">
      <AppHeader />
      <main class="page-shell fade-in">
        <router-view />
        <div class="footer-space" />
      </main>
    </div>
  </v-app>
</template>

<style scoped></style>
