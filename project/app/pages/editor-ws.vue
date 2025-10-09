<script setup lang="ts">
useSeoMeta({
  title: 'Lean Editor (WebSocket) - NextLean'
})

const editorContainer = ref<HTMLElement>()
const infoviewContainer = ref<HTMLElement>()

const { 
  editorInstance, 
  isLoading, 
  leanVersion, 
  error, 
  initializeEditor,
  isConnected,
  sessionId
} = useLeanEditor()

const code = ref(`-- Fibonacci Implementation in Lean 4

def fib : Nat → Nat
  | 0 => 0
  | 1 => 1
  | n + 2 => fib (n + 1) + fib n

#eval fib 10
`)

const fileName = ref('main.lean')
const useWebSocket = ref(true)
const connectionStatus = computed(() => {
  if (error.value) return `Error: ${error.value}`
  if (isConnected.value) return 'Connected'
  if (useWebSocket.value) return 'Connecting...'
  return 'WebSocket Disabled'
})

onMounted(async () => {
  if (!editorContainer.value) {
    console.error('Editor container not found')
    return
  }

  await initializeEditor(
    editorContainer.value,
    infoviewContainer.value,
    '/project/main.lean',
    code.value,
    useWebSocket.value
  )
})

const toggleWebSocket = async () => {
  useWebSocket.value = !useWebSocket.value
  
  if (editorContainer.value) {
    await initializeEditor(
      editorContainer.value,
      infoviewContainer.value,
      '/project/main.lean',
      code.value,
      useWebSocket.value
    )
  }
}

const newFile = () => {
  const newContent = '-- New Lean file\n\n'
  if (editorInstance.value && editorInstance.value.setValue) {
    editorInstance.value.setValue(newContent)
  }
  code.value = newContent
  fileName.value = 'untitled.lean'
}

const openFile = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.lean'
  input.onchange = (event: any) => {
    const file = event.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        if (e.target?.result) {
          const content = e.target.result as string
          if (editorInstance.value && editorInstance.value.setValue) {
            editorInstance.value.setValue(content)
          }
          code.value = content
          fileName.value = file.name
        }
      }
      reader.readAsText(file)
    }
  }
  input.click()
}

const saveFile = () => {
  const content = editorInstance.value?.getValue() || code.value
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName.value
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="h-screen flex flex-col">
    <div class="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
      <div class="px-4 py-2 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <h1 class="text-xl font-bold">Lean Editor</h1>
          <span class="text-sm text-gray-600 dark:text-gray-400">{{ fileName }}</span>
        </div>
        
        <div class="flex items-center gap-2">
          <div class="flex items-center gap-2 px-3 py-1 rounded bg-gray-100 dark:bg-gray-900">
            <div 
              class="w-2 h-2 rounded-full" 
              :class="isConnected ? 'bg-green-500' : 'bg-gray-400'"
            ></div>
            <span class="text-xs font-medium">{{ connectionStatus }}</span>
          </div>
          
          <UButton 
            size="sm" 
            variant="ghost" 
            @click="toggleWebSocket"
            :icon="useWebSocket ? 'tabler:plug-connected' : 'tabler:plug-disconnected'"
          >
            {{ useWebSocket ? 'Disconnect' : 'Connect' }}
          </UButton>
        </div>
      </div>
      
      <div class="px-4 py-2 flex items-center gap-2 bg-gray-50 dark:bg-gray-900">
        <UButton size="xs" variant="ghost" icon="tabler:file-plus" @click="newFile">
          New
        </UButton>
        <UButton size="xs" variant="ghost" icon="tabler:folder-open" @click="openFile">
          Open
        </UButton>
        <UButton size="xs" variant="ghost" icon="tabler:device-floppy" @click="saveFile">
          Save
        </UButton>
        <div class="flex-1"></div>
        <span class="text-xs text-gray-500">{{ leanVersion }}</span>
        <span v-if="sessionId" class="text-xs text-gray-500">Session: {{ sessionId.substring(0, 8) }}...</span>
      </div>
    </div>

    <div class="flex-1 flex overflow-hidden">
      <div class="flex-1 relative">
        <div 
          v-if="isLoading" 
          class="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-900"
        >
          <div class="text-center">
            <div class="text-lg font-semibold mb-2">Loading Editor...</div>
            <div class="text-sm text-gray-600 dark:text-gray-400">Please wait</div>
          </div>
        </div>
        
        <div 
          v-if="error && !isLoading" 
          class="absolute inset-0 flex items-center justify-center bg-red-50 dark:bg-red-950"
        >
          <div class="text-center max-w-md">
            <div class="text-lg font-semibold mb-2 text-red-600 dark:text-red-400">Error</div>
            <div class="text-sm text-red-700 dark:text-red-300">{{ error }}</div>
          </div>
        </div>
        
        <div ref="editorContainer" class="w-full h-full"></div>
      </div>

      <div class="w-96 border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
        <div ref="infoviewContainer" class="h-full"></div>
      </div>
    </div>

    <div class="border-t border-gray-200 dark:border-gray-800 px-4 py-2 bg-gray-50 dark:bg-gray-900 flex items-center justify-between">
      <div class="flex items-center gap-4">
        <UButton to="/" size="xs" variant="ghost">
          Home
        </UButton>
        <UButton to="/debug/websocket" size="xs" variant="ghost">
          WebSocket Test
        </UButton>
      </div>
      
      <div class="text-xs text-gray-500">
        Ready
      </div>
    </div>
  </div>
</template>
