<script setup lang="ts">
useSeoMeta({
  title: "LLM Chat - NextLean",
});
</script>

<template>
  <div class="p-8 space-y-8">
    <div class="space-y-2">
      <h1 class="text-4xl font-bold text-gray-900 dark:text-white">
        LLM Chat
      </h1>
      <p class="max-w-3xl text-gray-600 dark:text-gray-400">
        Collaborate with the NextLean assistant to explore Lean tactics, translate natural language descriptions, and connect with saved proofs.
      </p>
    </div>

    <div class="h-[75vh]">
      <AssistantChatPanel class="h-full" />
    </div>
  </div>
</template>
