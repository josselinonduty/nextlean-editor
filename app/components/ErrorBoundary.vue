<script setup lang="ts">
import { clientLogger } from "#shared/utils/logger";

const props = withDefaults(
  defineProps<{
    fallbackMessage?: string;
    showDetails?: boolean;
  }>(),
  {
    fallbackMessage: "Something went wrong",
    showDetails: false,
  }
);

const error = ref<Error | null>(null);

const handleError = (err: Error) => {
  error.value = err;
  clientLogger.error("ErrorBoundary", err);
};

const handleRetry = () => {
  error.value = null;
};

onErrorCaptured((err) => {
  handleError(err);
  return false;
});

const isDev = import.meta.dev;
</script>

<template>
  <div v-if="error" class="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
    <div class="flex items-start gap-3">
      <div class="shrink-0">
        <UIcon name="tabler:alert-circle" class="w-5 h-5 text-red-500" />
      </div>
      <div class="flex-1 min-w-0">
        <h3 class="text-sm font-medium text-red-800 dark:text-red-300">
          {{ fallbackMessage }}
        </h3>
        <p class="mt-1 text-sm text-red-600 dark:text-red-400">
          {{ error.message }}
        </p>
        <pre 
          v-if="showDetails && error.stack && isDev" 
          class="mt-2 text-xs text-red-500 dark:text-red-400 overflow-x-auto whitespace-pre-wrap max-h-40"
        >{{ error.stack }}</pre>
        <UButton 
          size="sm" 
          color="error" 
          variant="soft" 
          icon="tabler:refresh" 
          class="mt-3"
          @click="handleRetry"
        >
          Retry
        </UButton>
      </div>
    </div>
  </div>
  <slot v-else />
</template>
