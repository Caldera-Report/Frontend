<template>
  <header class="header">
    <div class="logo-outer">
      <a href="/" class="header-logo">
        <div class="logo-container">
          <img src="/Logo.png" alt="Caldera Report Logo" class="app-logo" />
          <h1 class="app-name">Caldera Report</h1>
        </div>
      </a>
    </div>

    <div class="header-container">
      <div class="header-center">
        <PlayerSearch :enable-remote-search="true" @select="onPlayerSelected" />
      </div>
      <div class="header-right">
        <!-- Space for future navigation items -->
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { type PlayerDTO } from '@/api/models'
import PlayerSearch from './PlayerSearch.vue'

function onPlayerSelected(p: PlayerDTO) {
  const idStr = p.id.toString()
  window.location.href = `/player/${idStr}`
}
</script>

<style scoped>
.header {
  position: relative;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.5);
}

.logo-outer {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 1010;
}

.header-container {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  max-width: 1400px;
  margin: 0 auto;
  height: 80px;
  width: 100%;
  gap: 16px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
  min-width: 250px;
  justify-self: start;
}

.logo-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.app-logo {
  height: 50px;
  width: auto;
  object-fit: contain;
}

.app-name {
  font-size: 1.8rem;
  font-weight: bold;
  margin: 0;
  background: linear-gradient(45deg, #ff6b6b, #ffa500, #ff1493);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  white-space: nowrap;
}

.header-center {
  grid-column: 2 / 3;
  justify-self: center;
  width: 100%;
  max-width: 420px;
  display: flex;
  justify-content: center;
}
.header-center > * {
  width: 100%;
}

.header-right {
  min-width: 250px;
  display: flex;
  justify-content: flex-end;
  justify-self: end;
}
</style>
