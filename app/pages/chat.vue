<script setup lang="ts">
useSeoMeta({
  title: "Chat - NextLean",
});
</script>

<template>
  <div class="flex flex-col h-full overflow-hidden">
    <div class="flex-none p-6 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
        Chat
      </h1>
      <p class="mt-1 text-gray-600 dark:text-gray-400">
        Collaborate with the NextLean assistant to explore Lean tactics, translate natural language descriptions, and connect with saved proofs.
      </p>
    </div>

    <div class="flex-1 min-h-0 p-6 bg-gray-50 dark:bg-gray-950 overflow-hidden">
      <AssistantChatPanel class="h-full" />
    </div>
  </div>
</template>
