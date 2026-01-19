<script setup lang="ts">
interface Props {
  fileName: string
  isModified: boolean
  isConnected: boolean
  isSaving: boolean
  proofsLoading: boolean
  theme: 'vs-dark' | 'vs-light'
  showInfoview: boolean
}

interface Emits {
  (e: 'newFile'): void
  (e: 'openFile'): void
  (e: 'saveFile'): void
  (e: 'saveProof'): void
  (e: 'toggleInfoview'): void
  (e: 'toggleTheme'): void
  (e: 'reconnect'): void
}

defineProps<Props>()
defineEmits<Emits>()
</script>

<template>
  <div
    class="flex-none border-b border-gray-200 dark:border-gray-800 p-2 flex items-center justify-between bg-gray-50 dark:bg-gray-900 z-10">
    <div class="flex items-center gap-2">
      <UButton icon="tabler:file-plus" size="xs" color="neutral" variant="ghost" @click="$emit('newFile')" title="New File" />
      <UButton icon="tabler:folder-open" size="xs" color="neutral" variant="ghost" @click="$emit('openFile')"
        title="Open File" />
      <UButton icon="tabler:device-floppy" size="xs" color="neutral" variant="ghost" @click="$emit('saveFile')"
        :disabled="!isModified" title="Save File" />

      <div class="h-4 w-px bg-gray-300 dark:bg-gray-700 mx-1"></div>

      <UButton icon="tabler:cloud-upload" size="xs" color="primary" variant="soft"
        :loading="isSaving || proofsLoading" label="Save Proof" @click="$emit('saveProof')" />

      <div class="h-4 w-px bg-gray-300 dark:bg-gray-700 mx-1"></div>

      <UButton :icon="showInfoview ? 'tabler:layout-sidebar-right-filled' : 'tabler:layout-sidebar-right'" size="xs"
        color="neutral" variant="ghost" @click="$emit('toggleInfoview')" title="Toggle Infoview" />

      <UButton :icon="theme === 'vs-dark' ? 'tabler:sun' : 'tabler:moon'" size="xs" color="neutral" variant="ghost"
        @click="$emit('toggleTheme')" title="Toggle Theme" />

      <div class="h-4 w-px bg-gray-300 dark:bg-gray-700 mx-1"></div>

      <UButton icon="tabler:reload" size="xs" color="neutral" variant="ghost" @click="$emit('reconnect')"
        title="Reload Lean Server" />

      <UBadge v-if="isConnected" color="success" variant="subtle" size="xs">
        <div class="flex items-center gap-1.5">
          <div class="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
          <span>Connected</span>
        </div>
      </UBadge>
      <UBadge v-else color="error" variant="subtle" size="xs">
        <div class="flex items-center gap-1.5">
          <div class="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
          <span>Disconnected</span>
        </div>
      </UBadge>
    </div>

    <div class="flex items-center gap-3 px-2">
      <span class="text-xs font-mono text-gray-500 dark:text-gray-400">
        {{ fileName }}{{ isModified ? '*' : '' }}
      </span>
    </div>
  </div>
</template>
