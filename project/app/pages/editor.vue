<script setup lang="ts">
import type { Diagnostic } from '#shared/types/lsp'

useSeoMeta({
  title: 'Lean Editor - NextLean'
})

const editorContainer = ref<HTMLElement>()
const mainContainer = ref<HTMLElement>()

const isLoading = ref(true)
const code = ref(`-- Welcome to NextLean Editor
-- This editor uses WebSocket to communicate with Lean 4 server

def hello : String := "Hello, Lean 4!"

#check hello
#eval hello

theorem one_plus_one : 1 + 1 = 2 := by rfl

#check one_plus_one
`)

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
    console.log('[Editor] Lean server ready')
    leanErrors.value = []
    showErrorModal.value = false
    
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
  if (connected) {
    console.log('[Editor] Lean server connected')
  } else {
    console.log('[Editor] Lean server disconnected')
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
      } catch (error) {
        console.error('[Hover] Error:', error)
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
  } catch (error) {
    console.error('Cleanup error:', error)
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
      } catch (error) {
        console.error('Failed to read file:', error)
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
</script>

<template>
  <div class="h-full flex flex-col">
    <UModal 
      v-model:open="showErrorModal" 
      title="Lean Server Error"
      :ui="{ 
        footer: 'justify-end',
        title: 'text-red-700 dark:text-red-400 font-semibold flex items-center gap-2'
      }"
    >
      <template #title>
        <UIcon name="tabler:alert-triangle" class="w-5 h-5 text-red-500" />
        <span>Lean Server Error</span>
      </template>

      <template #body>
        <div v-if="leanErrors.length > 0" class="space-y-4">
          <div 
            v-for="(error, idx) in leanErrors.slice(0, 5)" 
            :key="idx"
            class="border border-red-200 dark:border-red-800 rounded-lg overflow-hidden"
          >
            <div class="p-3 bg-red-50 dark:bg-red-900/20">
              <p class="text-sm text-red-600 dark:text-red-300 break-words font-mono mb-2">
                {{ error.message }}
              </p>
              <UAccordion
                :items="[
                  {
                    label: 'View Raw Message',
                    icon: 'tabler:code',
                    slot: 'raw-' + idx,
                    ui: {
                      trigger: 'text-xs',
                      label: 'text-xs'
                    }
                  }
                ]"
              >
                <template #[`raw-${idx}`]>
                  <pre class="text-xs font-mono bg-gray-900 dark:bg-gray-950 text-gray-100 p-3 rounded overflow-x-auto">{{ JSON.stringify(error.raw, null, 2) }}</pre>
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
        <UButton 
          color="neutral" 
          variant="outline"
          @click="showErrorModal = false"
        >
          Close
        </UButton>
        <UButton 
          color="error" 
          variant="solid"
          icon="tabler:reload"
          @click="reconnectLeanServer(); showErrorModal = false"
        >
          Reload Server
        </UButton>
      </template>
    </UModal>
    
    <div class="border-b border-gray-200 dark:border-gray-800 p-3 flex items-center justify-between bg-white dark:bg-gray-900">
      <div class="flex items-center gap-3">
        <UButton 
          icon="tabler:file-plus" 
          size="sm" 
          color="neutral"
          @click="newFile"
          title="New File"
        />
        <UButton 
          icon="tabler:folder-open" 
          size="sm" 
          color="neutral"
          @click="openFile"
          title="Open File"
        />
        <UButton 
          icon="tabler:device-floppy" 
          size="sm" 
          color="neutral"
          @click="saveFile"
          :disabled="!isModified"
          title="Save File"
        />
        
        <div class="h-6 w-px bg-gray-300 dark:bg-gray-700"></div>
        
        <UButton 
          :icon="showInfoview ? 'tabler:layout-sidebar-right' : 'tabler:layout-sidebar-right-collapse'"
          size="sm" 
          color="neutral"
          @click="toggleInfoview"
          title="Toggle Infoview"
        />
        
        <UButton 
          :icon="theme === 'vs-dark' ? 'tabler:sun' : 'tabler:moon'"
          size="sm" 
          color="neutral"
          @click="toggleTheme"
          title="Toggle Theme"
        />
        
        <div class="h-6 w-px bg-gray-300 dark:bg-gray-700"></div>
        
        <UButton 
          icon="tabler:reload" 
          size="sm" 
          color="neutral"
          @click="reconnectLeanServer()"
          title="Reload Lean Server"
        />
        
        <UBadge 
          v-if="leanLsp.connected.value" 
          color="success" 
          variant="subtle"
        >
          <div class="flex items-center gap-1.5">
            <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Lean Server Connected</span>
          </div>
        </UBadge>
        <UBadge 
          v-else 
          color="error" 
          variant="subtle"
        >
          <div class="flex items-center gap-1.5">
            <div class="w-2 h-2 bg-red-500 rounded-full"></div>
            <span>Disconnected</span>
          </div>
        </UBadge>
      </div>
      
      <div class="flex items-center gap-3">
        <span class="text-sm text-gray-600 dark:text-gray-400">
          {{ fileName }}{{ isModified ? ' •' : '' }}
        </span>
      </div>
    </div>
    
    <div class="flex-1 flex relative" ref="mainContainer">
      <div 
        class="flex-1 relative monaco-editor-container"
        :class="{ 'select-none': isResizing }"
        :style="{ width: showInfoview ? `${100 - infoviewWidth}%` : '100%' }"
      >
        <div 
          v-if="isLoading" 
          class="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-900"
        >
          <div class="text-center">
            <UIcon name="tabler:loader" class="w-8 h-8 animate-spin text-primary mb-2" />
            <p class="text-sm text-gray-600 dark:text-gray-400">Loading editor...</p>
          </div>
        </div>
        
        <div 
          ref="editorContainer" 
          class="absolute inset-0"
        ></div>
      </div>
      
      <div 
        v-if="showInfoview"
        class="w-1 bg-gray-200 dark:bg-gray-800 cursor-col-resize hover:bg-primary transition-colors flex-shrink-0"
        @mousedown="startResize"
      ></div>
      
      <div 
        v-if="showInfoview"
        class="flex-shrink-0 border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 transition-all duration-200"
        :style="{ width: `${infoviewWidth}%` }"
      >
        <div class="h-full flex flex-col p-2">
          <UTabs :items="infoviewTabs" class="w-full h-full">
            <template #lean>
              <div class="h-full w-full flex flex-col">
                <div class="flex-1 p-4 overflow-auto">
                  <UAccordion
                    :items="[
                      {
                        label: 'Goals',
                        icon: 'tabler:target',
                        defaultOpen: true,
                        slot: 'goals'
                      },
                      {
                        label: 'Hover Info',
                        icon: 'tabler:info-circle',
                        slot: 'hover'
                      },
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
                    ].filter(item => item.slot !== 'errors' || leanErrors.length > 0)"
                    multiple
                  >
                    <template #goals>
                      <div v-if="leanGoals" class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg font-mono text-xs whitespace-pre-wrap">
                        {{ leanGoals }}
                      </div>
                      <div v-else class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-xs text-gray-500">
                        No goals
                      </div>
                    </template>

                    <template #hover>
                      <div v-if="leanHoverInfo" class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg font-mono text-xs whitespace-pre-wrap">
                        {{ leanHoverInfo }}
                      </div>
                      <div v-else class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-xs text-gray-500">
                        No hover information
                      </div>
                    </template>

                    <template #diagnostics>
                      <div v-if="leanDiagnostics.length > 0" class="space-y-2">
                        <div 
                          v-for="(diag, idx) in leanDiagnostics" 
                          :key="idx"
                          class="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-xs"
                        >
                          <div class="flex items-start gap-2">
                            <UIcon name="tabler:alert-triangle" class="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                            <div class="flex-1 wrap-normal">
                              <div class="font-mono text-red-700 dark:text-red-400 mb-1">
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
                        No diagnostics
                      </div>
                    </template>

                    <template #errors>
                      <div class="space-y-2">
                        <div class="flex justify-end mb-2">
                          <UButton 
                            size="xs" 
                            variant="ghost" 
                            @click="leanErrors = []; showErrorModal = false"
                            title="Clear errors"
                          >
                            Clear
                          </UButton>
                        </div>
                        <div class="space-y-2 max-h-64 overflow-y-auto">
                          <div 
                            v-for="(error, idx) in leanErrors" 
                            :key="idx"
                            class="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-xs"
                          >
                            <div class="flex items-start gap-2">
                              <UIcon name="tabler:alert-circle" class="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                              <div class="flex-1 text-red-700 dark:text-red-300 break-words">
                                {{ error.message }}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </template>
                  </UAccordion>
                </div>
              </div>
            </template>
            
            <template #assist>
              <div class="h-full w-full flex flex-col">
                <div class="flex-1 p-4 flex items-center justify-center">
                  <div class="text-center space-y-4">
                    <div class="flex justify-center">
                      <div class="relative">
                        <UIcon name="tabler:robot" class="w-12 h-12 text-gray-400 dark:text-gray-600" />
                        <div class="absolute -top-1 -right-1">
                          <div class="w-3 h-3 bg-orange-500 rounded-full animate-pulse"></div>
                        </div>
                      </div>
                    </div>
                    <div class="space-y-2">
                      <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100">
                        AI Assistant
                      </h3>
                      <p class="text-sm text-gray-600 dark:text-gray-400 max-w-xs">
                        The AI assistant is currently being developed and will provide intelligent help with your Lean proofs.
                      </p>
                    </div>
                    <div class="flex items-center justify-center gap-2 text-xs text-orange-600 dark:text-orange-400">
                      <UIcon name="tabler:clock" class="w-4 h-4" />
                      <span>Work in Progress</span>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </UTabs>
        </div>
      </div>
    </div>
    
    <div class="border-t border-gray-200 dark:border-gray-800 px-3 py-2 bg-gray-50 dark:bg-gray-900 flex items-center justify-between text-sm">
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-3">
          <UIcon name="tabler:text-size" class="w-4 h-4 text-gray-500" />
          <USlider 
            v-model="fontSize" 
            :min="10" 
            :max="24"
            :step="1"
            class="w-24"
          />
          <span class="text-xs text-gray-600 dark:text-gray-400 w-8">{{ fontSize }}px</span>
        </div>
      </div>
      
      <div class="flex items-center gap-4">
        <span class="text-xs text-gray-500">
          Version: {{ documentVersion }}
        </span>
        <span class="text-xs text-gray-500">
          Lean WebSocket Editor
        </span>
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

