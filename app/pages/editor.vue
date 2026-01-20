<script setup lang="ts">
import type { SavedProof } from '#shared/types'
import type { Diagnostic } from '#shared/types/lsp'
import { clientLogger } from '#shared/utils/logger'

useSeoMeta({
  title: 'Editor - NextLean'
})

const route = useRoute()
const toast = useToast()
const { proofs, getProof } = useProofs()

const mainContainer = ref<HTMLElement>()
const monacoEditorRef = ref<InstanceType<typeof import('~/components/editor/MonacoEditor.vue').default>>()
const proofLibraryRef = ref<InstanceType<typeof import('~/components/editor/ProofLibrarySlideover.vue').default>>()

const {
  document: editorDocument,
  code,
  updateContent,
  updateCursor,
  setFileName,
  markSaved,
  markModified,
  incrementVersion,
  setDocumentOpen,
  reset: resetDocument,
  registerEditor
} = useEditorState()
const { settings, updateSettings } = useSettings()

const showInfoview = ref(true)
const infoviewWidth = ref(50)
const isResizing = ref(false)

const showSavePanel = ref(false)
const currentProofId = ref<string | null>(null)

const leanDiagnostics = ref<Diagnostic[]>([])
const leanGoals = ref<string | null>(null)
const leanErrors = ref<Array<{ message: string; raw: unknown }>>([])
const showErrorModal = ref(false)
const cursorPosition = ref<{ lineNumber: number; column: number }>({ lineNumber: 1, column: 1 })

let resizeAnimationFrame: number | null = null
let goalUpdateTimeout: ReturnType<typeof setTimeout> | null = null
let layoutTimeout: ReturnType<typeof setTimeout> | null = null

const leanLsp = useLeanLsp()

watch(() => leanLsp.ready.value, (ready) => {
  if (ready) {
    leanErrors.value = []
    showErrorModal.value = false

    leanLsp.openTextDocument(
      editorDocument.value.uri,
      'lean',
      editorDocument.value.version,
      code.value
    )
    setDocumentOpen(true)
  }
})

watch(() => leanLsp.connected.value, (connected) => {
  if (!connected) {
    setDocumentOpen(false)
  }
})

watch(() => leanLsp.diagnostics.value, (diagnosticsArray) => {
  if (diagnosticsArray.length > 0) {
    const latest = diagnosticsArray.at(-1)
    if (latest && latest.uri === editorDocument.value.uri) {
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
  if (monacoEditorRef.value) {
    registerEditor(monacoEditorRef.value as import('~/composables/useEditorState').MonacoEditorRef)
  }
  leanLsp.setupDiagnosticsListener()
  leanLsp.connect()
}

const updateGoalState = async () => {
  if (!leanLsp.ready.value || !editorDocument.value.isOpen) {
    leanGoals.value = null
    return
  }

  try {
    const result = await leanLsp.getGoalState(
      editorDocument.value.uri,
      cursorPosition.value.lineNumber - 1,
      cursorPosition.value.column - 1
    )

    if (result && result.goals && result.goals.length > 0) {
      leanGoals.value = result.goals.join('\n\n')
    } else if (result && result.rendered) {
      leanGoals.value = result.rendered
    } else {
      leanGoals.value = null
    }
  } catch {
    leanGoals.value = null
  }
}

const debouncedUpdateGoals = () => {
  if (goalUpdateTimeout) {
    clearTimeout(goalUpdateTimeout)
  }
  goalUpdateTimeout = setTimeout(updateGoalState, 300)
}

watch(cursorPosition, debouncedUpdateGoals, { deep: true })

const handleContentChange = () => {
  markModified()
  incrementVersion()

  if (editorDocument.value.isOpen && leanLsp.connected.value) {
    leanLsp.changeTextDocument(editorDocument.value.uri, editorDocument.value.version, [{
      text: code.value
    }])
  }

  debouncedUpdateGoals()
}

const handleCursorChange = (position: { lineNumber: number; column: number }) => {
  cursorPosition.value = position
}

const handleCodeUpdate = (newCode: string) => {
  updateContent(newCode)
}

const newFile = () => {
  const newContent = '-- New Lean file\n\n'
  monacoEditorRef.value?.setValue(newContent)
  setFileName('untitled.lean')
  markSaved()
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
        setFileName(file.name)
        markSaved()
      } catch (error) {
        clientLogger.error('editor.openFile', error, { fileName: file.name })
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
  a.download = editorDocument.value.fileName
  a.click()
  URL.revokeObjectURL(url)
  markSaved()
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
  updateContent(proof.content)
  currentProofId.value = proof.id
  markSaved()
}

const handleProofSaved = (proof: SavedProof) => {
  currentProofId.value = proof.id
  markSaved()
}

const loadProofFromDatabase = async () => {
  const proofId = route.query.proofId as string | undefined
  const encodedContent = route.query.content as string | undefined

  if (encodedContent) {
    const decoded = decodeURIComponent(encodedContent)
    monacoEditorRef.value?.setValue(decoded)
    updateContent(decoded)
    currentProofId.value = proofId || null
    markSaved()
    await navigateTo('/editor', { replace: true })
    return
  }

  if (proofId) {
    try {
      const proof = await getProof(proofId)
      if (proof) {
        handleLoadProof(proof)
      }
    } catch (error) {
      clientLogger.error('editor.loadProofFromDatabase', error, { proofId })
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

    if (layoutTimeout) {
      clearTimeout(layoutTimeout)
    }
    layoutTimeout = setTimeout(() => {
      monacoEditorRef.value?.layout()
    }, 16)
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
  try {
    await nextTick()
    await loadProofFromDatabase()
  } catch (error) {
    clientLogger.error('editor.onMounted', error)
    toast.add({
      title: 'Initialization error',
      description: 'Failed to initialize the editor. Please refresh the page.',
      color: 'error'
    })
  }
})

onUnmounted(() => {
  if (editorDocument.value.isOpen && leanLsp.connected.value) {
    leanLsp.closeTextDocument(editorDocument.value.uri)
  }
  leanLsp.disconnect()
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
  document.body.style.cursor = ''
  if (resizeAnimationFrame) {
    cancelAnimationFrame(resizeAnimationFrame)
  }
  if (goalUpdateTimeout) {
    clearTimeout(goalUpdateTimeout)
  }
  if (layoutTimeout) {
    clearTimeout(layoutTimeout)
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
      :file-name="editorDocument.fileName"
      :is-modified="editorDocument.isModified"
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

    <div class="flex-1 flex min-h-0 overflow-hidden" ref="mainContainer">
      <div class="relative h-full flex flex-col min-w-0 overflow-hidden" :class="{ 'select-none': isResizing }"
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
            :document-uri="editorDocument.uri"
            :document-version="editorDocument.version"
            :is-document-open="editorDocument.isOpen"
            :theme="settings.editorTheme"
            :font-size="settings.editorFontSize"
            :word-wrap="settings.editorWordWrap"
            :minimap="settings.editorMinimap"
            :line-numbers="settings.editorLineNumbers"
            @update:model-value="handleCodeUpdate"
            @content-change="handleContentChange"
            @cursor-change="handleCursorChange"
            @ready="handleEditorReady"
          />
          <template #fallback>
            <div class="flex-1 flex items-center justify-center bg-gray-900">
              <div class="flex flex-col items-center gap-4">
                <UIcon name="tabler:loader" class="w-8 h-8 text-gray-400 animate-spin" />
                <span class="text-gray-400 text-sm">Loading editor...</span>
              </div>
            </div>
          </template>
        </ClientOnly>
      </div>

      <button v-if="showInfoview"
        type="button"
        class="w-1 bg-gray-200 dark:bg-gray-800 cursor-col-resize hover:bg-primary transition-colors shrink-0 z-20 border-none p-0"
        aria-label="Resize panel. Use left and right arrow keys to adjust."
        @keydown.left.prevent="infoviewWidth = Math.min(70, infoviewWidth + 5); nextTick(() => monacoEditorRef?.layout())"
        @keydown.right.prevent="infoviewWidth = Math.max(20, infoviewWidth - 5); nextTick(() => monacoEditorRef?.layout())"
        @mousedown="startResize"></button>

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

:deep(.dashboard-panel) {
  overflow: hidden;
}
</style>
