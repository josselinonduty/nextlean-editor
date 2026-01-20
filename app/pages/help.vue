<script setup lang="ts">
useSeoMeta({
  title: 'Help & Resources - NextLean'
})

const resources = [
  {
    title: 'Lean 4 Manual',
    description: 'The official documentation for the Lean 4 theorem prover and programming language.',
    icon: 'tabler:book',
    url: 'https://leanprover.github.io/lean4/doc/',
    color: 'blue'
  },
  {
    title: 'Lean Community',
    description: 'Central hub for the Lean community, including news, events, and learning resources.',
    icon: 'tabler:users',
    url: 'https://leanprover-community.github.io/',
    color: 'green'
  },
  {
    title: 'Mathematics in Lean',
    description: 'An interactive introduction to formalizing mathematics in Lean.',
    icon: 'tabler:math-function',
    url: 'https://leanprover-community.github.io/mathematics_in_lean/',
    color: 'purple'
  },
  {
    title: 'Functional Programming',
    description: 'A guide to using Lean 4 as a functional programming language.',
    icon: 'tabler:code',
    url: 'https://leanprover.github.io/functional_programming_in_lean/',
    color: 'orange'
  },
  {
    title: 'Loogle',
    description: 'A search engine for Lean 4 libraries and theorems.',
    icon: 'tabler:search',
    url: 'https://loogle.lean-lang.org/',
    color: 'red'
  },
  {
    title: 'Lean Zulip Chat',
    description: 'The official chat platform for the Lean community. Great for asking questions.',
    icon: 'tabler:message-2',
    url: 'https://leanprover.zulipchat.com/',
    color: 'teal'
  }
]

const features = [
  {
    title: 'Lean Editor',
    description: 'A full-featured editor with syntax highlighting, error reporting, and goal visualization.',
    icon: 'tabler:edit'
  },
  {
    title: 'AI Assistant',
    description: 'Integrated LLM support to help you write proofs, explain concepts, and suggest tactics.',
    icon: 'tabler:robot'
  },
  {
    title: 'Proof Library',
    description: 'Save, organize, and manage your proofs. Search by tags or content.',
    icon: 'tabler:books'
  }
]
</script>

<template>
  <div class="h-full overflow-y-auto">
    <div class="p-8 max-w-7xl mx-auto space-y-12">
    <!-- Header -->
    <div class="text-center space-y-4">
      <h1 class="text-4xl font-bold text-gray-900 dark:text-white">
        Help & Resources
      </h1>
      <p class="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
        Everything you need to get started with NextLean and master Lean 4.
      </p>
    </div>

    <!-- About NextLean -->
    <div class="space-y-6">
      <h2 class="text-2xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
        <UIcon name="tabler:info-circle" class="text-primary-500" />
        About NextLean
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <UCard v-for="feature in features" :key="feature.title" class="bg-gray-50 dark:bg-gray-900/50">
          <div class="flex flex-col items-center text-center space-y-3">
            <div class="p-3 rounded-full bg-white dark:bg-gray-800 shadow-sm inline-flex items-center justify-center">
              <UIcon :name="feature.icon" class="w-8 h-8 text-primary-500" />
            </div>
            <h3 class="font-semibold text-gray-900 dark:text-white">{{ feature.title }}</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">{{ feature.description }}</p>
          </div>
        </UCard>
      </div>
    </div>

    <!-- Lean Resources -->
    <div class="space-y-6">
      <h2 class="text-2xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
        <UIcon name="tabler:book" class="text-primary-500" />
        Lean 4 Resources
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <UCard
          v-for="resource in resources"
          :key="resource.title"
          class="hover:ring-2 hover:ring-primary-500/50 transition-all group"
        >
          <template #header>
            <div class="flex items-center gap-3">
              <UIcon :name="resource.icon" class="w-6 h-6" :class="`text-${resource.color}-500`" />
              <h3 class="font-semibold text-gray-900 dark:text-white">{{ resource.title }}</h3>
            </div>
          </template>
          
          <div class="space-y-4">
            <p class="text-sm text-gray-600 dark:text-gray-400 min-h-[3rem]">
              {{ resource.description }}
            </p>
            <UButton
              :to="resource.url"
              target="_blank"
              color="neutral"
              variant="ghost"
              block
              icon="tabler:external-link"
              class="group-hover:bg-gray-100 dark:group-hover:bg-gray-800"
            >
              Visit Resource
            </UButton>
          </div>
        </UCard>
      </div>
    </div>

    <!-- FAQ / Tips -->
    <div class="space-y-6">
      <h2 class="text-2xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
        <UIcon name="tabler:bulb" class="text-primary-500" />
        Quick Tips
      </h2>
      <UAccordion
        :items="[
          {
            label: 'How do I start a new proof?',
            content: 'Go to the Editor page. You can start typing immediately. Use the \'New File\' button to clear the current workspace.',
            icon: 'tabler:file-plus'
          },
          {
            label: 'How does the AI assistant work?',
            content: 'In the Editor, open the \'Assist\' tab in the right panel. You can ask questions about your code, request proof suggestions, or ask for explanations of Lean concepts.',
            icon: 'tabler:robot'
          },
          {
            label: 'Can I save my work?',
            content: 'Yes! Click the \'Save Proof\' button in the editor toolbar. You can give your proof a title and tags. Access your saved proofs later from the Proofs page.',
            icon: 'tabler:device-floppy'
          },
          {
            label: 'What if the Lean server crashes?',
            content: 'If you encounter issues with the Lean server, try clicking the \'Reload Lean Server\' button (refresh icon) in the editor toolbar.',
            icon: 'tabler:reload'
          }
        ]"
      />
    </div>
  </div>
  </div>
</template>
