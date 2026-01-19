<script setup lang="ts">
import type { SavedProof } from '#shared/types'
import type { Diagnostic } from '#shared/types/lsp'

useSeoMeta({
  title: 'Editor - NextLean'
})

const route = useRoute()
const toast = useToast()
const { proofs, getProof } = useProofs()

const mainContainer = ref<HTMLElement>()
const monacoEditorRef = ref<InstanceType<typeof import('~/components/editor/MonacoEditor.vue').default>>()
const proofLibraryRef = ref<InstanceType<typeof import('~/components/editor/ProofLibrarySlideover.vue').default>>()

const { code, updateCode } = useEditorState()
const { settings, updateSettings } = useSettings()

const fileName = ref('main.lean')
const isModified = ref(false)
const showInfoview = ref(true)
const infoviewWidth = ref(50)
const isResizing = ref(false)
const documentVersion = ref(1)
const documentUri = ref('file:///workspace/main.lean')
const isDocumentOpen = ref(false)

const showSavePanel = ref(false)
const currentProofId = ref<string | null>(null)

const leanDiagnostics = ref<Diagnostic[]>([])
const leanGoals = ref<string | null>(null)
const leanErrors = ref<Array<{ message: string; raw: unknown }>>([])
const showErrorModal = ref(false)

let resizeAnimationFrame: number | null = null

const leanLsp = useLeanLsp()

watch(() => leanLsp.ready.value, (ready) => {
  if (ready) {
    leanErrors.value = []
    showErrorModal.value = false

    if (leanLsp.rootUri.value) {
      documentUri.value = `${leanLsp.rootUri.value}/Main.lean`
    }

    leanLsp.openTextDocument(
      documentUri.value,
      'lean',
      documentVersion.value,
      code.value
    )
    isDocumentOpen.value = true
  }
})

watch(() => leanLsp.connected.value, (connected) => {
  if (!connected) {
    isDocumentOpen.value = false
  }
})

watch(() => leanLsp.diagnostics.value, (diagnosticsArray) => {
  if (diagnosticsArray.length > 0) {
    const latest = diagnosticsArray.at(-1)
    if (latest && latest.uri === documentUri.value) {
      leanDiagnostics.value = latest.diagnostics
      monacoEditorRef.value?.updateEditorMarkers(leanDiagnostics.value)
    }
  }
}, { deep: true })

const reconnectLeanServer = () => {
  leanLsp.disconnect()
  setTimeout(() => {
    leanLsp.connect()
  }, 500)
}

const handleEditorReady = () => {
  leanLsp.setupDiagnosticsListener()
  leanLsp.connect()
}

const handleContentChange = () => {
  isModified.value = true
  documentVersion.value++

  if (isDocumentOpen.value && leanLsp.connected.value) {
    leanLsp.changeTextDocument(documentUri.value, documentVersion.value, [{
      text: code.value
    }])
  }
}

const handleCodeUpdate = (newCode: string) => {
  updateCode(newCode)
}

const newFile = () => {
  const newContent = '-- New Lean file\n\n'
  monacoEditorRef.value?.setValue(newContent)
  fileName.value = 'untitled.lean'
  isModified.value = false
  currentProofId.value = null
}

const openFile = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.lean'
  input.onchange = async (event: Event) => {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]
    if (file) {
      try {
        const content = await file.text()
        monacoEditorRef.value?.setValue(content)
        fileName.value = file.name
        isModified.value = false
      } catch {
        toast.add({
          title: 'File read error',
          description: 'Unable to read the selected file.',
          color: 'error'
        })
      }
    }
  }
  input.click()
}

const saveFile = () => {
  const content = monacoEditorRef.value?.getValue() || code.value
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName.value
  a.click()
  URL.revokeObjectURL(url)
  isModified.value = false
}

const handleOpenSavePanel = async () => {
  await proofLibraryRef.value?.ensureProofsLoaded()
  if (currentProofId.value) {
    proofLibraryRef.value?.initializeFromCurrentProof(currentProofId.value)
  }
  showSavePanel.value = true
}

const handleLoadProof = (proof: SavedProof) => {
  monacoEditorRef.value?.setValue(proof.content)
  updateCode(proof.content)
  currentProofId.value = proof.id
  isModified.value = false
}

const handleProofSaved = (proof: SavedProof) => {
  currentProofId.value = proof.id
  isModified.value = false
}

const loadProofFromDatabase = async () => {
  const proofId = route.query.proofId as string | undefined
  const encodedContent = route.query.content as string | undefined

  if (encodedContent) {
    const decoded = decodeURIComponent(encodedContent)
    monacoEditorRef.value?.setValue(decoded)
    updateCode(decoded)
    currentProofId.value = proofId || null
    isModified.value = false
    await navigateTo('/editor', { replace: true })
    return
  }

  if (proofId) {
    try {
      const proof = await getProof(proofId)
      if (proof) {
        handleLoadProof(proof)
      }
    } catch {
      toast.add({
        title: 'Unable to load proof',
        description: 'The requested proof could not be loaded from the server.',
        color: 'error'
      })
    } finally {
      await navigateTo('/editor', { replace: true })
    }
  }
}

const toggleTheme = async () => {
  const newTheme = settings.value.editorTheme === 'vs-dark' ? 'vs-light' : 'vs-dark'
  updateSettings({ editorTheme: newTheme })
  monacoEditorRef.value?.setTheme(newTheme)
}

const toggleInfoview = () => {
  showInfoview.value = !showInfoview.value
  nextTick(() => {
    monacoEditorRef.value?.layout()
  })
}

const startResize = (event: MouseEvent) => {
  isResizing.value = true
  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
  document.body.style.cursor = 'col-resize'
  event.preventDefault()
}

const handleResize = (event: MouseEvent) => {
  if (!isResizing.value || !mainContainer.value) return

  if (resizeAnimationFrame) {
    cancelAnimationFrame(resizeAnimationFrame)
  }

  resizeAnimationFrame = requestAnimationFrame(() => {
    if (!mainContainer.value) return

    const containerRect = mainContainer.value.getBoundingClientRect()
    const newInfoviewWidth = ((containerRect.right - event.clientX) / containerRect.width) * 100
    infoviewWidth.value = Math.max(20, Math.min(70, newInfoviewWidth))

    monacoEditorRef.value?.layout()
  })
}

const stopResize = () => {
  isResizing.value = false
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
  document.body.style.cursor = ''

  if (resizeAnimationFrame) {
    cancelAnimationFrame(resizeAnimationFrame)
    resizeAnimationFrame = null
  }

  setTimeout(() => {
    monacoEditorRef.value?.layout()
  }, 100)
}

watch(settings, async (newSettings) => {
  monacoEditorRef.value?.updateOptions({
    fontSize: newSettings.editorFontSize,
    wordWrap: newSettings.editorWordWrap,
    minimap: newSettings.editorMinimap,
    lineNumbers: newSettings.editorLineNumbers,
    theme: newSettings.editorTheme
  })
}, { deep: true })

watch(showInfoview, () => {
  nextTick(() => {
    setTimeout(() => {
      monacoEditorRef.value?.layout()
    }, 100)
  })
})

onMounted(async () => {
  if (!import.meta.client) return
  await nextTick()
  await loadProofFromDatabase()
})

onUnmounted(() => {
  if (isDocumentOpen.value && leanLsp.connected.value) {
    leanLsp.closeTextDocument(documentUri.value)
  }
  leanLsp.disconnect()
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
  document.body.style.cursor = ''
  if (resizeAnimationFrame) {
    cancelAnimationFrame(resizeAnimationFrame)
  }
})
</script>

<template>
  <div class="flex flex-col h-full w-full overflow-hidden bg-white dark:bg-gray-900">
    <UModal v-model:open="showErrorModal" title="Lean Server Error" :ui="{
      footer: 'justify-end',
      title: 'text-red-700 dark:text-red-400 font-semibold flex items-center gap-2'
    }">
      <template #title>
        <UIcon name="tabler:alert-triangle" class="w-5 h-5 text-red-500" />
        <span>Lean Server Error</span>
      </template>

      <template #body>
        <div v-if="leanErrors.length > 0" class="space-y-4">
          <div v-for="(error, idx) in leanErrors.slice(0, 5)" :key="idx"
            class="border border-red-200 dark:border-red-800 rounded-lg overflow-hidden">
            <div class="p-3 bg-red-50 dark:bg-red-900/20">
              <p class="text-sm text-red-600 dark:text-red-300 wrap-break-word font-mono mb-2">
                {{ error.message }}
              </p>
            </div>
          </div>
          <p v-if="leanErrors.length > 5" class="text-sm text-gray-500 dark:text-gray-400">
            ... and {{ leanErrors.length - 5 }} more error(s)
          </p>
        </div>
        <div v-else class="p-4 text-sm text-gray-500">
          No errors to display
        </div>
      </template>

      <template #footer>
        <UButton color="neutral" variant="outline" @click="showErrorModal = false">
          Close
        </UButton>
        <UButton color="error" variant="solid" icon="tabler:reload"
          @click="reconnectLeanServer(); showErrorModal = false">
          Reload Server
        </UButton>
      </template>
    </UModal>

    <EditorToolbar
      :file-name="fileName"
      :is-modified="isModified"
      :is-connected="leanLsp.connected.value"
      :is-saving="false"
      :proofs-loading="false"
      :theme="settings.editorTheme"
      :show-infoview="showInfoview"
      @new-file="newFile"
      @open-file="openFile"
      @save-file="saveFile"
      @save-proof="handleOpenSavePanel"
      @toggle-infoview="toggleInfoview"
      @toggle-theme="toggleTheme"
      @reconnect="reconnectLeanServer"
    />

    <div class="flex-1 flex min-h-0 relative" ref="mainContainer">
      <div class="relative h-full flex flex-col overflow-hidden" :class="{ 'select-none': isResizing }"
        :style="{ width: showInfoview ? `${100 - infoviewWidth}%` : '100%' }">
        <div v-if="!leanLsp.ready.value"
          class="absolute inset-0 z-50 bg-gray-900 text-white font-mono p-4 overflow-hidden flex flex-col">
          <div class="flex-none flex items-center gap-2 mb-4 border-b border-gray-700 pb-2">
            <UIcon name="tabler:terminal-2" class="w-5 h-5" />
            <h2 class="text-sm font-bold uppercase tracking-wider">Lean Server Console</h2>
          </div>
          <div class="flex-1 space-y-1 overflow-y-auto font-mono text-xs">
            <div v-for="(msg, idx) in leanLsp.consoleMessages.value" :key="idx" class="flex gap-2">
              <span class="text-gray-500 shrink-0">[{{ new Date(msg.timestamp).toLocaleTimeString() }}]</span>
              <span :class="{
                'text-blue-400': msg.type === 'info',
                'text-red-400': msg.type === 'error',
                'text-green-400': msg.type === 'success'
              }">{{ msg.message }}</span>
            </div>
          </div>
          <div class="flex-none mt-4 flex items-center justify-center gap-2 text-gray-400 text-xs"
            v-if="leanLsp.serverStatus.value !== 'ready'">
            <UIcon name="tabler:loader" class="w-4 h-4 animate-spin" />
            <span>{{ leanLsp.serverStatus.value }}</span>
          </div>
        </div>

        <ClientOnly>
          <EditorMonacoEditor
            ref="monacoEditorRef"
            v-model="code"
            :document-uri="documentUri"
            :document-version="documentVersion"
            :is-document-open="isDocumentOpen"
            :theme="settings.editorTheme"
            :font-size="settings.editorFontSize"
            :word-wrap="settings.editorWordWrap"
            :minimap="settings.editorMinimap"
            :line-numbers="settings.editorLineNumbers"
            @update:model-value="handleCodeUpdate"
            @content-change="handleContentChange"
            @ready="handleEditorReady"
          />
        </ClientOnly>
      </div>

      <div v-if="showInfoview"
        class="w-1 bg-gray-200 dark:bg-gray-800 cursor-col-resize hover:bg-primary transition-colors shrink-0 z-20"
        @mousedown="startResize"></div>

      <EditorInfoviewPanel
        v-if="showInfoview"
        :diagnostics="leanDiagnostics"
        :goals="leanGoals"
        :errors="leanErrors"
        :width="infoviewWidth"
      />
    </div>

    <EditorProofLibrarySlideover
      ref="proofLibraryRef"
      v-model:open="showSavePanel"
      :current-editor-content="code"
      :current-proof-id="currentProofId"
      @load="handleLoadProof"
      @saved="handleProofSaved"
    />

    <div
      class="flex-none border-t border-gray-200 dark:border-gray-800 px-3 py-1 bg-gray-50 dark:bg-gray-900 flex items-center justify-between text-xs">
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2">
          <UIcon name="tabler:text-size" class="w-3 h-3 text-gray-500" />
          <USlider v-model="settings.editorFontSize" :min="10" :max="24" :step="1" class="w-20" />
          <span class="text-gray-600 dark:text-gray-400 w-6">{{ settings.editorFontSize }}px</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cursor-col-resize {
  cursor: col-resize;
}

.select-none {
  user-select: none;
}

.select-none * {
  user-select: none;
  pointer-events: none;
}

.monaco-editor-container,
[class*="infoview"] {
  will-change: width;
  transform: translateZ(0);
}
</style>
