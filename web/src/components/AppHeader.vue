<template>
  <header class="site-header">
    <div class="site-header__inner">
      <router-link to="/" class="site-header__brand" aria-label="Caldera Report Home">
        <img src="/Logo.png" alt="Caldera Report Logo" class="site-header__logo" />
        <span class="site-header__name">Caldera Report</span>
      </router-link>
      <div class="site-header__search">
        <PlayerSearch />
      </div>
      <nav class="site-header__nav" aria-label="Primary Navigation">
        <!-- Future nav items -->
      </nav>
    </div>
  </header>
</template>

<script setup lang="ts">
import PlayerSearch from './PlayerSearch.vue'
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
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 76px;
  width: 100%;
  margin: 0;
  padding: 0 var(--space-8);
}
.site-header__search {
  justify-self: center;
  width: 100%;
  max-width: 520px;
}
.site-header__brand {
  position: absolute;
  left: var(--space-6);
  top: 50%;
  transform: translateY(-50%);
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
  width: 100%;
  max-width: 520px;
}

.site-header__nav {
  position: absolute;
  right: var(--space-6);
  top: 50%;
  transform: translateY(-50%);
}
@media (max-width: 860px) {
  .site-header__name {
    font-size: 1.1rem;
  }
}
@media (max-width: 640px) {
  .site-header__inner {
    height: auto;
    flex-direction: column;
    align-items: stretch;
    justify-content: flex-start;
    padding: var(--space-4) var(--space-5);
    gap: var(--space-4);
  }
  .site-header__brand {
    position: static;
    transform: none;
    justify-content: center;
    margin: 0 auto;
  }
  .site-header__logo {
    height: 42px;
  }
  .site-header__search {
    max-width: 100%;
    width: 100%;
    order: 3;
  }
  .site-header__nav {
    position: static;
    transform: none;
    order: 2;
    align-self: flex-end;
  }
}
@media (max-width: 400px) {
  .site-header__name {
    display: none;
  }
  .site-header__logo {
    height: 40px;
  }
}
</style>
