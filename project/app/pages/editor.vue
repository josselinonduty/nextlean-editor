<script setup lang="ts">
import type { SavedProof } from '#shared/types'
import type { Diagnostic } from '#shared/types/lsp'

useSeoMeta({
  title: 'Lean Editor - NextLean'
})

const route = useRoute()
const toast = useToast()
const { proofs, loading: proofsLoading, error: proofsError, fetchProofs, getProof, createProof, updateProof } = useProofs()


const editorContainer = ref<HTMLElement>()
const mainContainer = ref<HTMLElement>()

const isLoading = ref(true)
const { code } = useEditorState()

const fontSize = ref(14)
const theme = ref('vs-dark')
const fileName = ref('main.lean')
const isModified = ref(false)
const showInfoview = ref(true)
const infoviewWidth = ref(50)
const isResizing = ref(false)
const documentVersion = ref(1)
const documentUri = ref('file:///workspace/main.lean')
const isDocumentOpen = ref(false)

const showSavePanel = ref(false)
const proofTitle = ref('')
const proofTags = ref<string[]>([])
const isSaving = ref(false)
const currentProofId = ref<string | null>(null)
const selectedProofForUpdate = ref<string | null>(null)
const hasLoadedProofs = ref(false)
const proofSearch = ref('')
const filteredLibraryProofs = computed(() => {
  const term = proofSearch.value.trim().toLowerCase()
  if (!term) {
    return proofs.value
  }
  return proofs.value.filter((proof) => {
    const titleMatch = proof.title.toLowerCase().includes(term)
    const tagMatch = proof.tags.some(tag => tag.toLowerCase().includes(term))
    return titleMatch || tagMatch
  })
})
const isUpdateMode = computed(() => selectedProofForUpdate.value !== null)

const ensureProofsLoaded = async () => {
  if (hasLoadedProofs.value) return
  await fetchProofs()
  if (!proofsError.value) {
    hasLoadedProofs.value = true
  }
}

const handleOpenSavePanel = async () => {
  await ensureProofsLoaded()
  if (currentProofId.value && !selectedProofForUpdate.value) {
    const existing = proofs.value.find(proof => proof.id === currentProofId.value)
    if (existing) {
      proofTitle.value = existing.title
      proofTags.value = [...existing.tags]
      selectedProofForUpdate.value = existing.id
    }
  }
  showSavePanel.value = true
}

const leanDiagnostics = ref<Diagnostic[]>([])
const leanGoals = ref<string | null>(null)
const leanHoverInfo = ref<string | null>(null)
const leanErrors = ref<Array<{ message: string; raw: any }>>([])
const showErrorModal = ref(false)

const infoviewTabs = [
  {
    label: 'Lean',
    icon: 'tabler:math',
    slot: 'lean' as const
  },
  {
    label: 'Assist',
    icon: 'tabler:robot',
    slot: 'assist' as const
  }
]

let editorInstance: any = null
let resizeAnimationFrame: number | null = null
let hoverProvider: any = null
let decorationCollection: any = null
let currentEditingLine = ref<number | null>(null)

const leanLsp = useLeanLsp()

watch(() => leanLsp.ready.value, (ready) => {
  if (ready) {
    leanErrors.value = []
    showErrorModal.value = false

    // Update documentUri based on server rootUri if available
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
      updateEditorMarkers()
    }
  }
}, { deep: true })

watch(code, (newVal) => {
  if (editorInstance && editorInstance.getValue() !== newVal) {
    const position = editorInstance.getPosition()
    editorInstance.setValue(newVal)
    if (position) {
      editorInstance.setPosition(position)
    }
  }
})


const formatGoals = (goals: any): string => {
  if (Array.isArray(goals)) {
    return goals.map(g => {
      const hyps = g.hypotheses?.map((h: any) => `${h.names?.join(', ') || 'h'} : ${h.type}`).join('\n') || ''
      return `${hyps ? hyps + '\n' : ''}⊢ ${g.type}`
    }).join('\n\n')
  }
  return JSON.stringify(goals, null, 2)
}

const reconnectLeanServer = () => {
  leanLsp.disconnect()
  setTimeout(() => {
    leanLsp.connect()
  }, 500)
}

const updateEditorMarkers = async () => {
  if (!editorInstance) return

  const monaco = await import('monaco-editor')
  const model = editorInstance.getModel()
  if (!model) return

  const markers = leanDiagnostics.value.map((diag: any) => {
    let severity = monaco.MarkerSeverity.Info
    if (diag.severity === 1) {
      severity = monaco.MarkerSeverity.Error
    } else if (diag.severity === 2) {
      severity = monaco.MarkerSeverity.Warning
    }

    return {
      severity,
      startLineNumber: diag.range.start.line + 1,
      startColumn: diag.range.start.character + 1,
      endLineNumber: diag.range.end.line + 1,
      endColumn: diag.range.end.character + 1,
      message: diag.message
    }
  })

  monaco.editor.setModelMarkers(model, 'lean', markers)

  if (decorationCollection) {
    const lineCount = model.getLineCount()
    const decorations = leanDiagnostics.value
      .filter((diag: any) => {
        const line = diag.range.end.line + 1
        return currentEditingLine.value !== line && line > 0 && line <= lineCount
      })
      .map((diag: any) => {
        const line = diag.range.end.line + 1
        const endColumn = model.getLineMaxColumn(line)

        let contentColor = '#3b82f6'

        if (diag.severity === 1) {
          contentColor = '#ef4444'
        } else if (diag.severity === 2) {
          contentColor = '#f59e0b'
        }

        const message = diag.message.length > 80
          ? diag.message.substring(0, 80) + '...'
          : diag.message

        return {
          range: new monaco.Range(line, 1, line, endColumn),
          options: {
            isWholeLine: true,
            className: 'diagnostic-line-decoration',
            inlineClassName: 'diagnostic-inline',
            after: {
              content: `  ${message}`,
              inlineClassName: 'diagnostic-after-content',
              inlineClassNameAffectsLetterSpacing: true
            },
            linesDecorationsClassName: 'diagnostic-gutter',
            overviewRuler: {
              color: contentColor,
              position: monaco.editor.OverviewRulerLane.Right
            }
          }
        }
      })

    decorationCollection.set(decorations)
  }
}

onMounted(async () => {
  if (!import.meta.client) return

  try {
    isLoading.value = true

    if (!editorContainer.value) {
      throw new Error('Editor container not found')
    }

    await initializeMonaco()

    leanLsp.setupDiagnosticsListener()
    leanLsp.connect()

    await nextTick()
    await loadProofFromDatabase()

    await ensureProofsLoaded()

  } catch (error) {
    console.error('Failed to initialize editor:', error)
  }
})

const initializeMonaco = async () => {
  if (!editorContainer.value) return

  await nextTick()

  const monaco = await import('monaco-editor')

  if (!monaco.languages.getLanguages().some(lang => lang.id === 'lean4')) {
    monaco.languages.register({ id: 'lean4' })
  }

  monaco.languages.setMonarchTokensProvider('lean4', {
    keywords: [
      'def', 'theorem', 'lemma', 'example', 'axiom', 'inductive', 'structure',
      'class', 'instance', 'where', 'extends', 'by', 'have', 'show', 'let',
      'in', 'match', 'with', 'if', 'then', 'else', 'for', 'do', 'return',
      'import', 'open', 'namespace', 'section', 'variable', 'universe',
      'partial', 'unsafe', 'opaque', 'abbrev', 'deriving', 'macro', 'syntax',
      'notation', 'prefix', 'infix', 'postfix', 'precedence'
    ],
    operators: [
      '→', '←', '↔', '∀', '∃', '∧', '∨', '¬', '≠', '≤', '≥', '⊢', ':=',
      ':', '|', '⟨', '⟩', '⦃', '⦄', '⟪', '⟫'
    ],
    symbols: /[=><!~?:&|+\-*/%^]+/,
    tokenizer: {
      root: [
        [/--.*$/, 'comment'],
        [/\/-/, 'comment', '@comment'],
        [/[a-zA-Z_]\w*/, {
          cases: {
            '@keywords': 'keyword',
            '@default': 'identifier'
          }
        }],
        [/"([^"\\]|\\.)*$/, 'string.invalid'],
        [/"/, 'string', '@string'],
        [/\d+/, 'number'],
        [/@symbols/, {
          cases: {
            '@operators': 'operator',
            '@default': ''
          }
        }]
      ],
      comment: [
        [/[^/-]+/, 'comment'],
        [/-\//, 'comment', '@pop'],
        [/[/-]/, 'comment']
      ],
      string: [
        [/[^\\"]+/, 'string'],
        [/"/, 'string', '@pop'],
        [/\\./, 'string.escape']
      ]
    }
  })

  editorInstance = monaco.editor.create(editorContainer.value, {
    value: code.value,
    language: 'lean4',
    theme: theme.value,
    fontSize: fontSize.value,
    wordWrap: 'on',
    minimap: { enabled: true },
    lineNumbers: 'on',
    scrollBeyondLastLine: false,
    renderWhitespace: 'selection',
    tabSize: 2,
    insertSpaces: true,
    automaticLayout: true,
    hover: {
      enabled: true,
      delay: 300,
      sticky: true
    },
    quickSuggestions: false
  })

  hoverProvider = monaco.languages.registerHoverProvider('lean4', {
    provideHover: async (model: any, position: any) => {
      if (!isDocumentOpen.value || !leanLsp.connected.value) {
        return null
      }

      try {
        const result: any = await leanLsp.getHover(
          documentUri.value,
          position.lineNumber - 1,
          position.column - 1
        )

        if (result && result.contents) {
          let hoverText = ''

          if (typeof result.contents === 'string') {
            hoverText = result.contents
          } else if (result.contents.value) {
            hoverText = result.contents.value
          } else if (result.contents.kind === 'markdown') {
            hoverText = result.contents.value || ''
          } else if (Array.isArray(result.contents)) {
            hoverText = result.contents
              .map((c: any) => (typeof c === 'string' ? c : c.value || ''))
              .join('\n\n')
          }

          if (hoverText) {
            return {
              range: result.range ? new monaco.Range(
                result.range.start.line + 1,
                result.range.start.character + 1,
                result.range.end.line + 1,
                result.range.end.character + 1
              ) : undefined,
              contents: [
                { value: hoverText, isTrusted: true }
              ]
            }
          }
        }
      } catch {
        // Hover error - silently fail
      }

      return null
    }
  })

  decorationCollection = editorInstance.createDecorationsCollection([])

  editorInstance.onDidChangeCursorPosition((e: any) => {
    const newLine = e.position.lineNumber
    if (currentEditingLine.value !== newLine) {
      currentEditingLine.value = newLine
      updateEditorMarkers()
    }
  })

  editorInstance.onDidBlurEditorText(() => {
    if (currentEditingLine.value !== null) {
      currentEditingLine.value = null
      updateEditorMarkers()
    }
  })

  editorInstance.onDidChangeModelContent(() => {
    code.value = editorInstance.getValue()
    isModified.value = true

    documentVersion.value++

    if (isDocumentOpen.value && leanLsp.connected.value) {
      leanLsp.changeTextDocument(documentUri.value, documentVersion.value, [{
        text: code.value
      }])
    }
  })

  isLoading.value = false
}

onUnmounted(() => {
  try {
    if (hoverProvider) {
      hoverProvider.dispose()
      hoverProvider = null
    }

    if (decorationCollection) {
      decorationCollection.clear()
      decorationCollection = null
    }

    if (editorInstance) {
      if (isDocumentOpen.value && leanLsp.connected.value) {
        leanLsp.closeTextDocument(documentUri.value)
      }
      editorInstance.dispose()
      editorInstance = null
    }

    leanLsp.disconnect()

    document.removeEventListener('mousemove', handleResize)
    document.removeEventListener('mouseup', stopResize)
    document.body.style.cursor = ''
    if (resizeAnimationFrame) {
      cancelAnimationFrame(resizeAnimationFrame)
    }
  } catch {
    // Cleanup error - silently fail
  }
})

const newFile = () => {
  const newContent = '-- New Lean file\n\n'
  if (editorInstance) {
    editorInstance.setValue(newContent)
  }
  fileName.value = 'untitled.lean'
  isModified.value = false
}

const openFile = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.lean'
  input.onchange = async (event: any) => {
    const file = event.target.files[0]
    if (file) {
      try {
        const content = await file.text()
        if (editorInstance) {
          editorInstance.setValue(content)
        }
        fileName.value = file.name
        isModified.value = false
      } catch {
        // File read error - silently fail
      }
    }
  }
  input.click()
}

const saveFile = () => {
  const content = editorInstance?.getValue() || code.value
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName.value
  a.click()
  URL.revokeObjectURL(url)
  isModified.value = false
}

const saveProofToDatabase = async () => {
  if (!proofTitle.value.trim()) {
    toast.add({
      title: 'Missing title',
      description: 'Please provide a descriptive proof title before saving.',
      color: 'warning'
    })
    return
  }

  isSaving.value = true
  try {
    const content = editorInstance?.getValue() || code.value
    const payloadTags = proofTags.value

    const wasUpdate = isUpdateMode.value && currentProofId.value !== null

    const result = currentProofId.value && wasUpdate
      ? await updateProof(currentProofId.value, {
        title: proofTitle.value,
        content,
        tags: payloadTags
      })
      : await createProof({
        title: proofTitle.value,
        content,
        tags: payloadTags
      })

    if (result) {
      currentProofId.value = result.id
      selectedProofForUpdate.value = result.id
      proofTitle.value = result.title
      proofTags.value = [...result.tags]
      isModified.value = false
      showSavePanel.value = false
      toast.add({
        title: wasUpdate ? 'Proof updated' : 'Proof saved',
        description: 'Your proof is available in the library tab.',
        color: 'success'
      })
      hasLoadedProofs.value = true
    }
  } catch {
    toast.add({
      title: 'Save failed',
      description: 'An error occurred while saving the proof. Please try again.',
      color: 'error'
    })
  } finally {
    isSaving.value = false
  }
}

const resetSaveState = () => {
  proofTitle.value = ''
  proofTags.value = []
  selectedProofForUpdate.value = null
}

const prepareUpdate = async (proof: SavedProof) => {
  await ensureProofsLoaded()
  currentProofId.value = proof.id
  proofTitle.value = proof.title
  proofTags.value = [...proof.tags]
  selectedProofForUpdate.value = proof.id
  showSavePanel.value = true
}

const prepareCreate = async () => {
  await ensureProofsLoaded()
  resetSaveState()
  currentProofId.value = null
  showSavePanel.value = true
}

const loadProofIntoEditor = (proof: SavedProof) => {
  if (editorInstance) {
    editorInstance.setValue(proof.content)
  }
  code.value = proof.content
  currentProofId.value = proof.id
  proofTitle.value = proof.title
  proofTags.value = [...proof.tags]
  selectedProofForUpdate.value = proof.id
  isModified.value = false
  toast.add({
    title: 'Proof loaded',
    description: 'You can continue editing this proof.',
    color: 'info'
  })
  showSavePanel.value = false
}

const formatProofTimestamp = (timestamp: number) => {
  return new Date(timestamp).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const copyProofContent = async (proof: SavedProof) => {
  if (typeof navigator === 'undefined' || !navigator.clipboard) {
    toast.add({
      title: 'Copy unavailable',
      description: 'Clipboard is not available in this environment.',
      color: 'warning'
    })
    return
  }

  try {
    await navigator.clipboard.writeText(proof.content)
    toast.add({
      title: 'Copied content',
      description: 'Proof content copied to clipboard.',
      color: 'success'
    })
  } catch {
    toast.add({
      title: 'Copy failed',
      description: 'Unable to copy proof content.',
      color: 'error'
    })
  }
}

const loadProofFromDatabase = async () => {
  const proofId = route.query.proofId as string | undefined
  const encodedContent = route.query.content as string | undefined

  if (encodedContent) {
    const decoded = decodeURIComponent(encodedContent)
    if (editorInstance) {
      editorInstance.setValue(decoded)
    }
    code.value = decoded
    currentProofId.value = proofId || null
    isModified.value = false
    await navigateTo('/editor', { replace: true })
    return
  }

  if (proofId) {
    try {
      const proof = await getProof(proofId)
      if (proof) {
        loadProofIntoEditor(proof)
        proofTitle.value = proof.title
        proofTags.value = [...proof.tags]
        currentProofId.value = proof.id
        selectedProofForUpdate.value = proof.id
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
  theme.value = theme.value === 'vs-dark' ? 'vs-light' : 'vs-dark'
  if (editorInstance) {
    const monaco = await import('monaco-editor')
    monaco.editor.setTheme(theme.value)
  }
}

const toggleInfoview = () => {
  showInfoview.value = !showInfoview.value

  nextTick(() => {
    if (editorInstance) {
      editorInstance.layout()
    }
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

    if (editorInstance) {
      editorInstance.layout()
    }
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

  if (editorInstance) {
    setTimeout(() => {
      editorInstance.layout()
    }, 100)
  }
}

watch(fontSize, (newSize) => {
  if (editorInstance) {
    editorInstance.updateOptions({ fontSize: newSize })
  }
})

watch(showInfoview, () => {
  nextTick(() => {
    if (editorInstance) {
      setTimeout(() => {
        editorInstance.layout()
      }, 100)
    }
  })
})

watch(showSavePanel, async (open) => {
  if (open) {
    await ensureProofsLoaded()
  }
})

watch(() => proofsError.value, (message) => {
  if (message) {
    toast.add({
      title: 'Proof library error',
      description: message,
      color: 'error'
    })
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
              <p class="text-sm text-red-600 dark:text-red-300 break-words font-mono mb-2">
                {{ error.message }}
              </p>
              <UAccordion :items="[
                {
                  label: 'View Raw Message',
                  icon: 'tabler:code',
                  slot: 'raw-' + idx,
                  ui: {
                    trigger: 'text-xs',
                    label: 'text-xs'
                  }
                }
              ]">
                <template #[`raw-${idx}`]>
                  <pre
                    class="text-xs font-mono bg-gray-900 dark:bg-gray-950 text-gray-100 p-3 rounded overflow-x-auto">{{ JSON.stringify(error.raw, null, 2) }}</pre>
                </template>
              </UAccordion>
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

    <!-- Toolbar -->
    <div
      class="flex-none border-b border-gray-200 dark:border-gray-800 p-2 flex items-center justify-between bg-gray-50 dark:bg-gray-900 z-10">
      <div class="flex items-center gap-2">
        <UButton icon="tabler:file-plus" size="xs" color="neutral" variant="ghost" @click="newFile" title="New File" />
        <UButton icon="tabler:folder-open" size="xs" color="neutral" variant="ghost" @click="openFile"
          title="Open File" />
        <UButton icon="tabler:device-floppy" size="xs" color="neutral" variant="ghost" @click="saveFile"
          :disabled="!isModified" title="Save File" />

        <div class="h-4 w-px bg-gray-300 dark:bg-gray-700 mx-1"></div>

        <UButton icon="tabler:cloud-upload" size="xs" color="primary" variant="soft"
          :loading="isSaving || proofsLoading" label="Save Proof" @click="handleOpenSavePanel" />

        <div class="h-4 w-px bg-gray-300 dark:bg-gray-700 mx-1"></div>

        <UButton :icon="showInfoview ? 'tabler:layout-sidebar-right-filled' : 'tabler:layout-sidebar-right'" size="xs"
          color="neutral" variant="ghost" @click="toggleInfoview" title="Toggle Infoview" />

        <UButton :icon="theme === 'vs-dark' ? 'tabler:sun' : 'tabler:moon'" size="xs" color="neutral" variant="ghost"
          @click="toggleTheme" title="Toggle Theme" />

        <div class="h-4 w-px bg-gray-300 dark:bg-gray-700 mx-1"></div>

        <UButton icon="tabler:reload" size="xs" color="neutral" variant="ghost" @click="reconnectLeanServer()"
          title="Reload Lean Server" />

        <UBadge v-if="leanLsp.connected.value" color="success" variant="subtle" size="xs">
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

    <!-- Main Editor Area -->
    <div class="flex-1 flex min-h-0 relative" ref="mainContainer">
      <!-- Editor Column -->
      <div class="relative h-full flex flex-col overflow-hidden" :class="{ 'select-none': isResizing }"
        :style="{ width: showInfoview ? `${100 - infoviewWidth}%` : '100%' }">
        <!-- Console Overlay (when server not ready) -->
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

        <!-- Loading Overlay -->
        <div v-if="isLoading" class="absolute inset-0 z-40 flex items-center justify-center bg-white dark:bg-gray-900">
          <div class="text-center">
            <UIcon name="tabler:loader" class="w-8 h-8 animate-spin text-primary mb-2" />
            <p class="text-sm text-gray-600 dark:text-gray-400">Loading editor...</p>
          </div>
        </div>

        <!-- Monaco Editor Container -->
        <div ref="editorContainer" class="absolute inset-0 w-full h-full"></div>
      </div>

      <!-- Resize Handle -->
      <div v-if="showInfoview"
        class="w-1 bg-gray-200 dark:bg-gray-800 cursor-col-resize hover:bg-primary transition-colors flex-shrink-0 z-20"
        @mousedown="startResize"></div>

      <!-- Infoview Column -->
      <div v-if="showInfoview"
        class="flex-shrink-0 border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 transition-all duration-200 flex flex-col overflow-hidden h-full"
        :style="{ width: `${infoviewWidth}%` }">
        <div class="h-full flex flex-col">
          <UTabs :items="infoviewTabs" class="w-full h-full flex flex-col"
            :ui="{ list: 'flex-none', content: 'flex-1 min-h-0 overflow-hidden' }">
            <template #lean>
              <div class="h-full w-full flex flex-col overflow-hidden">
                <div class="flex-1 p-4 overflow-y-auto">
                  <UAccordion :items="[
                    {
                      label: 'Diagnostics',
                      icon: 'tabler:alert-circle',
                      badge: leanDiagnostics.length > 0 ? leanDiagnostics.length : undefined,
                      slot: 'diagnostics'
                    },
                    {
                      label: 'Server Errors',
                      icon: 'tabler:bug',
                      badge: leanErrors.length > 0 ? leanErrors.length : undefined,
                      slot: 'errors'
                    }
                  ].filter(item => item.slot !== 'errors' || leanErrors.length > 0)" type="multiple"
                    :default-value="['0']">
                    <template #diagnostics>
                      <div v-if="leanDiagnostics.length > 0" class="space-y-2">
                        <div v-for="(diag, idx) in leanDiagnostics" :key="idx"
                          class="p-3 bg-info-50 dark:bg-info-900/20 rounded-lg text-xs">
                          <div class="flex items-start gap-2">
                            <div class="flex-1 wrap-normal">
                              <div class="font-mono text-info-700 dark:text-info-400 mb-1">
                                Line {{ diag.range.start.line + 1 }}:{{ diag.range.start.character + 1 }}
                              </div>
                              <div class="text-gray-900 dark:text-gray-100 wrap-anywhere">
                                {{ diag.message }}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div v-else class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-xs text-gray-500">
                        No diagnostics available
                      </div>
                    </template>

                    <template #errors>
                      <div v-if="leanErrors.length > 0" class="space-y-2">
                        <div v-for="(error, idx) in leanErrors" :key="idx"
                          class="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-xs">
                          <div class="text-red-600 dark:text-red-300 break-words font-mono">
                            {{ error.message }}
                          </div>
                        </div>
                      </div>
                    </template>
                  </UAccordion>

                  <div class="mt-6">
                    <h3 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                      <UIcon name="tabler:target" class="w-4 h-4" />
                      Goals
                    </h3>
                    <div v-if="leanGoals"
                      class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg font-mono text-xs whitespace-pre-wrap">
                      {{ leanGoals }}
                    </div>
                    <div v-else class="text-xs text-gray-500 italic">
                      No goals at cursor position
                    </div>
                  </div>
                </div>
              </div>
            </template>

            <template #assist>
              <div class="h-full w-full p-0 overflow-hidden">
                <AssistantChatPanel />
              </div>
            </template>
          </UTabs>
        </div>
      </div>
    </div>

    <!-- Save Proof Slide-over -->
    <USlideover v-model:open="showSavePanel" title="Proof Library" side="right"
      :ui="{ content: 'max-w-lg w-full bg-white dark:bg-gray-950' }">
      <template #content="{ close }">
        <div class="flex flex-col h-full">
          <div class="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ isUpdateMode ? 'Update Proof' : 'Save Proof' }}
            </h3>
            <UButton color="neutral" variant="ghost" icon="tabler:x" @click="showSavePanel = false" />
          </div>

          <div class="flex-1 overflow-y-auto p-4 space-y-6">
            <form @submit.prevent="handleSaveProof" class="space-y-4">
              <UFormField label="Title" name="title">
                <UInput v-model="proofTitle" placeholder="e.g. Fundamental Theorem of Calculus" autofocus />
              </UFormField>

              <UFormField label="Tags" name="tags" help="Press Enter to add a tag">
                <div class="space-y-2">
                  <div class="flex flex-wrap gap-2 mb-2" v-if="proofTags.length > 0">
                    <UBadge v-for="tag in proofTags" :key="tag" color="primary" variant="soft"
                      class="cursor-pointer hover:bg-primary-200 dark:hover:bg-primary-800"
                      @click="proofTags = proofTags.filter(t => t !== tag)">
                      {{ tag }}
                      <UIcon name="tabler:x" class="ml-1 w-3 h-3" />
                    </UBadge>
                  </div>
                  <UInput placeholder="Add tags..." @keydown.enter.prevent="(e: any) => {
                    const val = e.target.value.trim()
                    if (val && !proofTags.includes(val)) {
                      proofTags.push(val)
                      e.target.value = ''
                    }
                  }" />
                </div>
              </UFormField>

              <div class="pt-2">
                <UButton type="submit" block color="primary" :loading="isSaving"
                  :icon="isUpdateMode ? 'tabler:refresh' : 'tabler:device-floppy'">
                  {{ isUpdateMode ? 'Update Proof' : 'Save to Library' }}
                </UButton>

                <UButton v-if="isUpdateMode" block variant="ghost" color="neutral" class="mt-2"
                  @click="selectedProofForUpdate = null; proofTitle = ''; proofTags = []">
                  Save as New Instead
                </UButton>
              </div>
            </form>

            <div class="border-t border-gray-200 dark:border-gray-800 pt-6">
              <h4 class="text-sm font-medium text-gray-900 dark:text-white mb-3">Existing Proofs</h4>
              <UInput v-model="proofSearch" icon="tabler:search" placeholder="Search proofs..." size="sm"
                class="mb-3" />

              <div v-if="proofsLoading" class="flex justify-center py-4">
                <UIcon name="tabler:loader" class="animate-spin text-gray-400" />
              </div>

              <div v-else-if="filteredLibraryProofs.length === 0" class="text-center py-4 text-sm text-gray-500">
                No proofs found
              </div>

              <div v-else class="space-y-2 max-h-60 overflow-y-auto pr-1">
                <div v-for="proof in filteredLibraryProofs" :key="proof.id"
                  class="p-3 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-primary-500 dark:hover:border-primary-500 cursor-pointer transition-colors group"
                  :class="{ 'bg-primary-50 dark:bg-primary-900/10 border-primary-200 dark:border-primary-800': selectedProofForUpdate === proof.id }">
                  <div class="flex justify-between items-start mb-1">
                    <h5 class="text-sm font-medium text-gray-900 dark:text-white truncate pr-2">{{ proof.title }}</h5>
                    <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <UButton size="xs" variant="ghost" color="info" icon="tabler:edit" @click="prepareUpdate(proof)">
                        Edit</UButton>
                    </div>
                  </div>
                  <div class="flex flex-wrap gap-1 mb-2">
                    <span v-for="tag in proof.tags.slice(0, 3)" :key="tag"
                      class="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-gray-600 dark:text-gray-400">
                      {{ tag }}
                    </span>
                  </div>
                  <div class="flex justify-between items-center mt-2">
                    <span class="text-[10px] text-gray-400">
                      {{ new Date(proof.updatedAt).toLocaleDateString() }}
                    </span>
                    <div class="flex gap-2">
                      <UButton size="xs" variant="soft" color="neutral" icon="tabler:upload" title="Load into editor"
                        @click="loadProofIntoEditor(proof); showSavePanel = false">
                        Load
                      </UButton>
                      <UButton size="xs" variant="ghost" color="neutral" icon="tabler:copy" title="Copy content"
                        @click="copyProofContent(proof)" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </USlideover>

    <!-- Footer Status Bar -->
    <div
      class="flex-none border-t border-gray-200 dark:border-gray-800 px-3 py-1 bg-gray-50 dark:bg-gray-900 flex items-center justify-between text-xs">
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2">
          <UIcon name="tabler:text-size" class="w-3 h-3 text-gray-500" />
          <USlider v-model="fontSize" :min="10" :max="24" :step="1" class="w-20" />
          <span class="text-gray-600 dark:text-gray-400 w-6">{{ fontSize }}px</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.monaco-editor-container {
  position: relative;
  overflow: hidden;
}

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

.select-none .monaco-editor-container {
  pointer-events: auto;
}

.monaco-editor-container,
[class*="infoview"] {
  will-change: width;
  transform: translateZ(0);
}

:deep(.diagnostic-after-content) {
  opacity: 0.7;
  font-style: italic;
  font-size: 0.95em;
  color: inherit;
  margin-left: 1em;
  padding: 0.1em 0.5em;
  border-radius: 3px;
}

:deep(.diagnostic-line-decoration) {
  background-color: rgba(59, 130, 246, 0.08);
  border-left: 3px solid rgba(59, 130, 246, 0.5);
  padding-left: 4px;
}

:deep(.monaco-editor .line-numbers) {
  padding-right: 8px;
}
</style>
