<script setup lang="ts">
useSeoMeta({
  title: 'Lean4Monaco Test - NextLean'
})

const editorContainer = ref<HTMLElement>()
const infoviewContainer = ref<HTMLElement>()
const { initializeEditor, dispose, isLoading, error, leanVersion } = useLean4Monaco()

const initialCode = `def hello := "world"

theorem add_comm (a b : Nat) : a + b = b + a := by
  sorry

#eval hello
`

onMounted(async () => {
  if (!import.meta.client) return
  
  try {
    if (!editorContainer.value) {
      throw new Error('Editor container not found')
    }
    
    console.log('Initializing Lean4Monaco...')
    await initializeEditor(
      editorContainer.value,
      infoviewContainer.value,
      '/project/test.lean',
      initialCode
    )
    console.log('Lean4Monaco initialized successfully')
  } catch (err) {
    console.error('Failed to initialize editor:', err)
  }
})

onUnmounted(() => {
  dispose()
})
</script>

<template>
  <div class="h-full flex flex-col">
    <div class="border-b border-gray-200 dark:border-gray-800 p-3 bg-white dark:bg-gray-900">
      <div class="flex items-center justify-between">
        <h1 class="text-xl font-semibold">Lean4Monaco Test</h1>
        <div class="flex items-center gap-3">
          <span class="text-sm text-gray-600 dark:text-gray-400">
            {{ leanVersion }}
          </span>
          <UBadge v-if="isLoading" color="yellow">Loading...</UBadge>
          <UBadge v-else-if="error" color="red">Error</UBadge>
          <UBadge v-else color="green">Ready</UBadge>
        </div>
      </div>
      <div v-if="error" class="mt-2 text-sm text-red-600 dark:text-red-400">
        {{ error }}
      </div>
    </div>

    <div class="flex-1 flex">
      <div class="flex-1 relative bg-gray-900">
        <div 
          v-if="isLoading"
          class="absolute inset-0 flex items-center justify-center bg-gray-800 text-white z-10"
        >
          <div class="text-center">
            <UIcon name="tabler:loader-2" class="animate-spin mb-2" size="24" />
            <p>Loading Lean4Monaco...</p>
          </div>
        </div>
        
        <div 
          ref="editorContainer" 
          class="w-full h-full"
        />
      </div>

      <div 
        ref="infoviewContainer"
        class="w-1/3 h-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700"
      />
    </div>
  </div>
</template>
