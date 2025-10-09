<script setup lang="ts">
useSeoMeta({
  title: 'Editor Test - NextLean'
})

// Test lean4monaco basic functionality
const testStatus = ref('Not tested')
const testResults = ref<string[]>([])

const runTests = async () => {
  testStatus.value = 'Running tests...'
  testResults.value = []
  
  try {
    // Test 1: Check if lean4monaco can be imported
    testResults.value.push('⏳ Testing lean4monaco import...')
    const { LeanMonaco, LeanMonacoEditor } = await import('lean4monaco')
    testResults.value.push('✅ lean4monaco imported successfully')
    
    // Test 2: Check if we can create instances
    testResults.value.push('⏳ Testing instance creation...')
    const leanMonaco = new LeanMonaco()
    const editor = new LeanMonacoEditor()
    testResults.value.push('✅ Instances created successfully')
    
    // Test 3: Check if API endpoint is accessible
    testResults.value.push('⏳ Testing API endpoint...')
    const response = await fetch('/api/lean')
    const data = await response.json()
    testResults.value.push(`✅ API endpoint responded: ${data.message}`)
    
    testStatus.value = 'All tests passed!'
    
    // Cleanup
    leanMonaco.dispose()
    editor.dispose()
    
  } catch (error) {
    testResults.value.push(`❌ Test failed: ${error}`)
    testStatus.value = 'Tests failed'
    console.error('Test error:', error)
  }
}
</script>

<template>
  <div class="p-8">
    <h1 class="text-2xl font-bold mb-6">NextLean Editor Integration Test</h1>
    
    <div class="space-y-4">
      <UButton @click="runTests" color="primary">
        Run Integration Tests
      </UButton>
      
      <div class="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
        <h3 class="font-semibold mb-2">Test Status: {{ testStatus }}</h3>
        <div class="space-y-1">
          <div v-for="result in testResults" :key="result" class="text-sm font-mono">
            {{ result }}
          </div>
        </div>
      </div>
      
      <div class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
        <h3 class="font-semibold mb-2">Integration Details:</h3>
        <ul class="space-y-1 text-sm">
          <li>• lean4monaco package integration</li>
          <li>• Vite configuration with node polyfills</li>
          <li>• Static asset copying for infoview</li>
          <li>• WebSocket proxy for Lean server</li>
          <li>• Monaco Editor with Lean 4 language support</li>
        </ul>
      </div>
      
      <UButton to="/editor" color="success" variant="outline">
        Go to Lean Editor
      </UButton>
    </div>
  </div>
</template>