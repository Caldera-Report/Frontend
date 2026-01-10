<script setup lang="ts">
import type { NuxtError } from "#app";

const props = defineProps<{ error: NuxtError }>();
</script>

<template>
  <div
    class="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-100"
  >
    <div class="bg-white p-8 rounded shadow-md w-full max-w-md text-center">
      <h1 class="text-4xl font-bold text-red-600 mb-4">
        Error {{ props.error.statusCode }}
      </h1>
      <p class="text-lg text-gray-700 mb-6">{{ props.error.data }}</p>
      <NuxtLink to="/" class="text-blue-500 hover:underline"
        >Go back to Home</NuxtLink
      >
    </div>
  </div>
</template>
