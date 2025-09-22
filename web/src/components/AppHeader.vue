<template>
  <header class="site-header">
    <div class="site-header__inner">
      <a ref="brandEl" href="/" class="site-header__brand" aria-label="Caldera Report Home">
        <img src="/Logo.png" alt="Caldera Report Logo" class="site-header__logo" />
        <span class="site-header__name">Caldera Report</span>
      </a>
      <div class="site-header__search">
        <PlayerSearch :enable-remote-search="true" @select="onPlayerSelected" />
      </div>
      <nav class="site-header__nav" :style="navMirrorStyle" aria-label="Primary Navigation">
        <!-- Future nav items -->
      </nav>
    </div>
  </header>
</template>

<script setup lang="ts">
import { type PlayerDTO } from '@/api/models'
import PlayerSearch from './PlayerSearch.vue'
import { ref, onMounted, nextTick } from 'vue'

function onPlayerSelected(p: PlayerDTO) {
  const idStr = p.id.toString()
  window.location.href = `/player/${idStr}`
}

const brandEl = ref<HTMLElement | null>(null)
const brandWidth = ref(0)
const navMirrorStyle = ref<Record<string, string>>({})

function measureBrand() {
  if (!brandEl.value) return
  brandWidth.value = brandEl.value.getBoundingClientRect().width
  navMirrorStyle.value = { width: brandWidth.value + 'px' }
}

onMounted(() => {
  nextTick(() => {
    measureBrand()
    window.addEventListener('resize', measureBrand)
  })
})
</script>

<style scoped>
.site-header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--color-border);
  box-shadow: 0 4px 14px -6px rgba(0, 0, 0, 0.7);
}
.site-header__inner {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  height: 76px;
  width: 100%;
  margin: 0;
  padding: 0 var(--space-4) 0 0;
  column-gap: var(--space-12);
}
.site-header__brand {
  justify-self: start;
}
.site-header__search {
  justify-self: center;
  width: 100%;
  max-width: 520px;
}
.site-header__brand {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  color: var(--color-text);
  text-decoration: none;
}
.site-header__logo {
  height: 48px;
  width: auto;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.6));
}
.site-header__name {
  font-size: 1.35rem;
  font-weight: 600;
  letter-spacing: 0.75px;
  color: var(--color-text);
}
.site-header__search {
  flex: 1;
  max-width: 480px;
}
@media (max-width: 860px) {
  .site-header__inner {
    gap: var(--space-6);
  }
  .site-header__name {
    font-size: 1.1rem;
  }
}
</style>
