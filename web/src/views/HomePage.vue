<template>
  <title>Caldera Report</title>
  <section class="stack" style="min-height: 50vh; justify-content: center">
    <div class="stack" style="gap: 12px; max-width: 760px">
      <h1 class="page-title" style="font-size: 2.4rem">Caldera Report</h1>
      <p style="font-size: 1.05rem; line-height: 1.55; opacity: 0.88">
        Track Destiny activities, analyze performance, and explore leaderboards. Use the search bar
        above to find a player and dive into detailed raid and dungeon history.
      </p>
      <div class="flex" style="gap: 12px">
        <button
          class="btn-accent"
          @click="
            $router.push({ name: 'Leaderboard', params: { type: 'completions', activityId: '0' } })
          "
        >
          View Leaderboards
        </button>
        <button class="btn-soft" @click="scrollToExplore">Explore</button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
function scrollToExplore() {
  window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })
}
</script>
