<script setup lang="ts">
useSeoMeta({
  title: 'Home - NextLean'
})

const actions = [
  {
    title: 'Code Editor',
    description: 'Write Lean 4 code with real-time syntax highlighting, error checking, and goal visualization.',
    icon: 'tabler:code',
    to: '/editor'
  },
  {
    title: 'AI Assistant',
    description: 'Get intelligent suggestions, proof explanations, and tactic recommendations.',
    icon: 'tabler:sparkles',
    to: '/chat'
  },
  {
    title: 'Proof Library',
    description: 'Manage your saved proofs, organize with tags, and build your personal knowledge base.',
    icon: 'tabler:books',
    to: '/proofs'
  }
]

const stats = [
  { label: 'Lean Version', value: 'v4.x' },
  { label: 'Environment', value: 'Web-based' },
  { label: 'Assistance', value: 'AI-Powered' }
]
</script>

<template>
  <div class="h-full overflow-y-auto">
    <div class="p-8 max-w-7xl mx-auto space-y-16">
    <!-- Hero Section -->
    <div class="text-center space-y-8 py-12">
      <div class="space-y-4">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-sm font-medium">
          <UIcon name="tabler:sparkles" class="w-4 h-4" />
          <span>Next Generation Lean Editor</span>
        </div>
        <h1 class="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white tracking-tight">
          Formal Verification <br />
          <span class="text-primary-500">Made Accessible</span>
        </h1>
        <p class="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
          Experience the power of Lean 4 with an integrated AI assistant. Write proofs faster, learn as you go, and organize your work efficiently.
        </p>
      </div>

      <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
        <UButton
          to="/editor"
          size="xl"
          color="primary"
          icon="tabler:rocket"
          class="px-8"
        >
          Start Proving
        </UButton>
        <UButton
          to="/help"
          size="xl"
          color="neutral"
          variant="ghost"
          icon="tabler:book"
        >
          Read Documentation
        </UButton>
      </div>

      <!-- Stats/Badges -->
      <div class="grid grid-cols-3 gap-8 max-w-2xl mx-auto pt-8 border-t border-gray-200 dark:border-gray-800">
        <div v-for="stat in stats" :key="stat.label" class="text-center">
          <div class="text-2xl font-bold text-gray-900 dark:text-white">{{ stat.value }}</div>
          <div class="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wider">{{ stat.label }}</div>
        </div>
      </div>
    </div>

    <!-- Main Actions Grid -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
      <UCard
        v-for="action in actions"
        :key="action.title"
        class="hover:ring-2 hover:ring-primary-500/50 transition-all cursor-pointer group relative overflow-hidden"
        @click="navigateTo(action.to)"
      >
        <div class="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <UIcon :name="action.icon" class="w-24 h-24" />
        </div>
        
        <div class="relative z-10 space-y-4">
          <div class="p-3 rounded-full bg-primary-50 dark:bg-primary-900/30 w-fit inline-flex items-center justify-center">
            <UIcon :name="action.icon" class="w-8 h-8 text-primary-500" />
          </div>
          
          <div class="space-y-2">
            <h3 class="text-xl font-bold text-gray-900 dark:text-white group-hover:text-primary-500 transition-colors">
              {{ action.title }}
            </h3>
            <p class="text-gray-600 dark:text-gray-400 leading-relaxed">
              {{ action.description }}
            </p>
          </div>

          <div class="pt-4 flex items-center text-primary-500 font-medium group-hover:translate-x-1 transition-transform">
            <span>Get Started</span>
            <UIcon name="tabler:arrow-right" class="ml-2 w-4 h-4" />
          </div>
        </div>
      </UCard>
    </div>
  </div>
  </div>
</template>