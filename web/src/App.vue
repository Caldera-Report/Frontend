<script setup lang="ts">
import AppHeader from '@/components/AppHeader.vue'
</script>

<template>
  <v-app>
    <div id="app">
      <AppHeader />
      <main class="main-content">
        <router-view />
      </main>
    </div>
  </v-app>
</template>

<style scoped></style>
