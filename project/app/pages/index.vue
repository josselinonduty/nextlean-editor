<script setup lang="ts">
useSeoMeta({
  title: 'Home - NextLean'
})
</script>

<template>
  <div class="p-8 space-y-8">
    <!-- Welcome Header -->
    <div class="text-center space-y-4">
      <h1 class="text-4xl font-bold text-gray-900 dark:text-white">
        Welcome to NextLean
      </h1>
      <p class="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
        A modern Lean 4 development environment with AI assistance for mathematical proof writing and formal verification.
      </p>
    </div>

    <!-- Quick Actions -->
    <div class="max-w-4xl mx-auto">
      <h2 class="text-2xl font-semibold text-gray-900 dark:text-white mb-6 text-center">
        Quick Actions
      </h2>
      
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <UCard class="hover:shadow-lg transition-shadow cursor-pointer group">
          <template #header>
            <div class="flex items-center gap-3">
              <UIcon name="tabler:code" class="text-2xl text-info" />
              <h3 class="text-xl font-semibold">Editor</h3>
            </div>
          </template>
          
          <div class="space-y-3">
            <p class="text-gray-600 dark:text-gray-400">
              Write and edit Lean 4 code with syntax highlighting, error detection, and AI assistance.
            </p>
            
            <NuxtLink to="/editor">
              <UButton 
                block 
                color="info"
                icon="tabler:arrow-right"
                class="group-hover:bg-info-600"
              >
                Open Editor
              </UButton>
            </NuxtLink>
          </div>
        </UCard>

        <UCard class="hover:shadow-lg transition-shadow cursor-pointer group">
          <template #header>
            <div class="flex items-center gap-3">
              <UIcon name="tabler:message-circle" class="text-2xl text-success" />
              <h3 class="text-xl font-semibold">Chat</h3>
            </div>
          </template>

          <div class="space-y-3">
            <p class="text-gray-600 dark:text-gray-400">
              Discuss Lean strategies with the AI assistant, get suggestions, and reference relevant saved proofs.
            </p>

            <NuxtLink to="/chat">
              <UButton
                block
                color="success"
                icon="tabler:arrow-right"
                class="group-hover:bg-success-600"
              >
                Open Chat
              </UButton>
            </NuxtLink>
          </div>
        </UCard>

        <UCard class="hover:shadow-lg transition-shadow cursor-pointer group">
          <template #header>
            <div class="flex items-center gap-3">
              <UIcon name="tabler:file-text" class="text-2xl text-primary" />
              <h3 class="text-xl font-semibold">Proofs</h3>
            </div>
          </template>
          
          <div class="space-y-3">
            <p class="text-gray-600 dark:text-gray-400">
              Browse and manage your mathematical proofs and formal verification projects.
            </p>
            
            <NuxtLink to="/proofs">
              <UButton 
                block 
                icon="tabler:arrow-right"
                class="group-hover:bg-primary-600"
              >
                View Proofs
              </UButton>
            </NuxtLink>
          </div>
        </UCard>
      </div>
    </div>
  </div>
</template>