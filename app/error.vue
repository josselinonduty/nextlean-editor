<script setup lang="ts">
import type { NuxtError } from "#app";

const props = defineProps<{
  error: NuxtError;
}>();

const handleClearError = () => clearError({ redirect: "/" });

const handleReload = () => {
  clearError();
  globalThis.location.reload();
};

const statusCode = computed(() => props.error?.statusCode ?? 500);
const statusMessage = computed(() => {
  if (statusCode.value === 404) return "Page not found";
  if (statusCode.value === 403) return "Access denied";
  if (statusCode.value === 500) return "Server error";
  return props.error?.statusMessage ?? "An error occurred";
});

const isDev = import.meta.dev;
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
    <div class="text-center space-y-6 max-w-md">
      <div class="flex justify-center">
        <div class="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <UIcon name="tabler:alert-triangle" class="w-10 h-10 text-red-500" />
        </div>
      </div>

      <div class="space-y-2">
        <h1 class="text-6xl font-bold text-gray-900 dark:text-white">{{ statusCode }}</h1>
        <h2 class="text-xl font-medium text-gray-700 dark:text-gray-300">{{ statusMessage }}</h2>
        <p v-if="error.message && error.message !== statusMessage" class="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
          {{ error.message }}
        </p>
      </div>

      <div v-if="error.stack && isDev" class="text-left bg-gray-100 dark:bg-gray-900 p-4 rounded-lg overflow-x-auto">
        <pre class="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{{ error.stack }}</pre>
      </div>

      <div class="flex flex-col sm:flex-row gap-3 justify-center">
        <UButton
          icon="tabler:home"
          color="primary"
          variant="solid"
          size="lg"
          @click="handleClearError"
        >
          Go to Home
        </UButton>
        <UButton
          icon="tabler:refresh"
          color="neutral"
          variant="outline"
          size="lg"
          @click="handleReload"
        >
          Try Again
        </UButton>
      </div>
    </div>
  </div>
</template>
