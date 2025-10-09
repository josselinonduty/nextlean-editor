<script setup lang="ts">
// Set page title using useSeoMeta
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
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- Lean Editor Card -->
        <UCard class="hover:shadow-lg transition-shadow cursor-pointer group">
          <template #header>
            <div class="flex items-center gap-3">
              <UIcon name="tabler:code" class="text-2xl text-primary" />
              <h3 class="text-xl font-semibold">Lean Editor</h3>
            </div>
          </template>
          
          <div class="space-y-3">
            <p class="text-gray-600 dark:text-gray-400">
              Write and edit Lean 4 code with syntax highlighting, error detection, and AI assistance.
            </p>
            
            <NuxtLink to="/editor">
              <UButton 
                block 
                icon="tabler:arrow-right"
                class="group-hover:bg-primary-600"
              >
                Open Editor
              </UButton>
            </NuxtLink>
          </div>
        </UCard>

        <!-- Proofs Card -->
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

        <!-- Tutorials Card -->
        <UCard class="hover:shadow-lg transition-shadow cursor-pointer group">
          <template #header>
            <div class="flex items-center gap-3">
              <UIcon name="tabler:book" class="text-2xl text-primary" />
              <h3 class="text-xl font-semibold">Tutorials</h3>
            </div>
          </template>
          
          <div class="space-y-3">
            <p class="text-gray-600 dark:text-gray-400">
              Learn Lean 4 with interactive tutorials and guided examples.
            </p>
            
            <NuxtLink to="/tutorials">
              <UButton 
                block 
                icon="tabler:arrow-right"
                class="group-hover:bg-primary-600"
              >
                Start Learning
              </UButton>
            </NuxtLink>
          </div>
        </UCard>
      </div>
    </div>

    <!-- Features Overview -->
    <div class="max-w-4xl mx-auto mt-12">
      <h2 class="text-2xl font-semibold text-gray-900 dark:text-white mb-6 text-center">
        Features
      </h2>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="flex items-start gap-3">
          <UIcon name="tabler:robot" class="text-primary mt-1" />
          <div>
            <h3 class="font-semibold mb-1">AI-Powered Assistant</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              Get intelligent suggestions and explanations for your Lean proofs.
            </p>
          </div>
        </div>
        
        <div class="flex items-start gap-3">
          <UIcon name="tabler:language" class="text-primary mt-1" />
          <div>
            <h3 class="font-semibold mb-1">Lean 4 Integration</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              Full Lean 4 language server support with real-time error checking.
            </p>
          </div>
        </div>
        
        <div class="flex items-start gap-3">
          <UIcon name="tabler:palette" class="text-primary mt-1" />
          <div>
            <h3 class="font-semibold mb-1">Modern Interface</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              Clean, responsive design with dark mode support.
            </p>
          </div>
        </div>
        
        <div class="flex items-start gap-3">
          <UIcon name="tabler:users" class="text-primary mt-1" />
          <div>
            <h3 class="font-semibold mb-1">Collaborative</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              Share and collaborate on formal proofs with others.
            </p>
          </div>
        </div>
      </div>
    </div>

    <div class="max-w-4xl mx-auto mt-12 pt-8 border-t border-gray-200 dark:border-gray-800">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4 text-center">
        Developer Tools
      </h2>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <NuxtLink to="/editor-ws">
          <UButton variant="outline" block icon="tabler:plug">
            WebSocket-Enabled Editor
          </UButton>
        </NuxtLink>
        
        <NuxtLink to="/debug/websocket">
          <UButton variant="outline" block icon="tabler:bug">
            WebSocket Connection Test
          </UButton>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>