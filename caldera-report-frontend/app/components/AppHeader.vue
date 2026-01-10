<template>
  <header
    class="sticky top-0 z-50 bg-zinc-900/95 backdrop-blur-lg border-b border-zinc-800 shadow-xl"
  >
    <div class="container mx-auto px-4 lg:px-6">
      <div
        class="flex items-center justify-between lg:justify-center gap-4 h-20"
      >
        <router-link
          to="/"
          class="flex items-center gap-3 lg:absolute lg:left-6 hover:opacity-80 transition-opacity"
          aria-label="Caldera Report Home"
        >
          <img src="/Logo.png" alt="Caldera Report Logo" class="h-10 w-auto" />
          <span
            class="hidden sm:block text-xl font-bold text-white tracking-wide"
          >
            Caldera Report
          </span>
        </router-link>

        <div class="flex-1 lg:flex-none w-full lg:w-[520px] max-w-2xl">
          <PlayerSearch />
        </div>
        <nav
          class="hidden lg:block lg:absolute lg:right-6"
          aria-label="Primary Navigation"
        >
          <!-- Future nav items -->
        </nav>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts"></script>
