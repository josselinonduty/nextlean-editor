<script setup lang="ts">
useSeoMeta({
  title: 'WebSocket Test - NextLean'
})

const { connect, disconnect, sendRPCRequest, isConnected, sessionId, error } = useLeanWebSocket()

const connectionStatus = computed(() => {
  if (error.value) return `Error: ${error.value}`
  if (isConnected.value) return 'Connected'
  return 'Disconnected'
})

const logs = ref<string[]>([])

const addLog = (message: string) => {
  const timestamp = new Date().toLocaleTimeString()
  logs.value.push(`[${timestamp}] ${message}`)
}

const handleConnect = () => {
  addLog('Attempting to connect...')
  connect()
}

const handleDisconnect = () => {
  addLog('Disconnecting...')
  disconnect()
}

const handleTestRPC = async () => {
  if (!isConnected.value) {
    addLog('Cannot send RPC: not connected')
    return
  }

  try {
    addLog('Sending test RPC request...')
    const response = await sendRPCRequest('initialize', {
      processId: null,
      rootUri: null,
      capabilities: {}
    })
    addLog(`RPC Response: ${JSON.stringify(response)}`)
  } catch (err) {
    addLog(`RPC Error: ${err}`)
  }
}

watch(isConnected, (newValue) => {
  if (newValue) {
    addLog('WebSocket connected successfully')
  } else {
    addLog('WebSocket disconnected')
  }
})

watch(sessionId, (newValue) => {
  if (newValue) {
    addLog(`Session ID: ${newValue}`)
  }
})

watch(error, (newValue) => {
  if (newValue) {
    addLog(`Error: ${newValue}`)
  }
})
</script>

<template>
  <div class="p-8 max-w-4xl mx-auto">
    <h1 class="text-3xl font-bold mb-6">WebSocket Connection Test</h1>

    <div class="space-y-6">
      <UCard>
        <template #header>
          <h2 class="text-xl font-semibold">Connection Status</h2>
        </template>

        <div class="space-y-4">
          <div class="flex items-center gap-4">
            <div class="flex items-center gap-2">
              <div 
                class="w-3 h-3 rounded-full" 
                :class="isConnected ? 'bg-green-500' : 'bg-red-500'"
              ></div>
              <span class="font-medium">{{ connectionStatus }}</span>
            </div>
            <span v-if="sessionId" class="text-sm text-gray-600 dark:text-gray-400">
              Session: {{ sessionId }}
            </span>
          </div>

          <div class="flex gap-2">
            <UButton 
              @click="handleConnect" 
              :disabled="isConnected"
              color="primary"
            >
              Connect
            </UButton>
            <UButton 
              @click="handleDisconnect" 
              :disabled="!isConnected"
              color="red"
            >
              Disconnect
            </UButton>
            <UButton 
              @click="handleTestRPC" 
              :disabled="!isConnected"
              color="success"
            >
              Test RPC
            </UButton>
          </div>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <h2 class="text-xl font-semibold">Connection Logs</h2>
        </template>

        <div class="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm h-96 overflow-y-auto">
          <div v-for="(log, index) in logs" :key="index" class="mb-1">
            {{ log }}
          </div>
          <div v-if="logs.length === 0" class="text-gray-500">
            No logs yet. Connect to see activity.
          </div>
        </div>
      </UCard>

      <div class="flex gap-2">
        <UButton to="/editor" variant="outline">
          Go to Editor
        </UButton>
        <UButton to="/" variant="ghost">
          Back to Home
        </UButton>
      </div>
    </div>
  </div>
</template>
