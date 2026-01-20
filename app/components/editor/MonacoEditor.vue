<script setup lang="ts">
import type { Diagnostic } from '#shared/types/lsp'
import { clientLogger } from '#shared/utils/logger'
import type { LeanHoverContents } from '#shared/types/lean'
import type { MonacoEditorUpdateOptions } from '#shared/types/monaco'

interface Props {
  modelValue: string
  documentUri: string
  documentVersion: number
  isDocumentOpen: boolean
  language?: string
  theme?: 'vs-dark' | 'vs-light'
  fontSize?: number
  wordWrap?: boolean
  minimap?: boolean
  lineNumbers?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: string): void
  (e: 'cursorChange', position: { lineNumber: number; column: number }): void
  (e: 'contentChange'): void
  (e: 'ready'): void
  (e: 'blur'): void
}

const props = withDefaults(defineProps<Props>(), {
  language: 'lean4',
  theme: 'vs-dark',
  fontSize: 14,
  wordWrap: true,
  minimap: true,
  lineNumbers: true
})

const emit = defineEmits<Emits>()

const leanLsp = useLeanLsp()

const editorContainer = ref<HTMLElement>()
const isLoading = ref(true)
const currentEditingLine = ref<number | null>(null)

let editorInstance: import('monaco-editor').editor.IStandaloneCodeEditor | null = null
let hoverProvider: { dispose(): void } | null = null
let decorationCollection: import('monaco-editor').editor.IEditorDecorationsCollection | null = null

const updateEditorMarkers = async (diagnostics: Diagnostic[]) => {
  if (!editorInstance) return

  const monaco = await import('monaco-editor')
  const model = editorInstance.getModel()
  if (!model) return

  const markers = diagnostics.map((diag) => {
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
    const decorations = diagnostics
      .filter((diag) => {
        const line = diag.range.end.line + 1
        return currentEditingLine.value !== line && line > 0 && line <= lineCount
      })
      .map((diag) => {
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
    value: props.modelValue,
    language: props.language,
    theme: props.theme,
    fontSize: props.fontSize,
    wordWrap: props.wordWrap ? 'on' : 'off',
    minimap: { enabled: props.minimap },
    lineNumbers: props.lineNumbers ? 'on' : 'off',
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
    provideHover: async (model, position) => {
      if (!props.isDocumentOpen || !leanLsp.connected.value) {
        return null
      }

      try {
        const result = await leanLsp.getHover(
          props.documentUri,
          position.lineNumber - 1,
          position.column - 1
        )

        if (result && result.contents) {
          let hoverText = ''

          if (typeof result.contents === 'string') {
            hoverText = result.contents
          } else if (!Array.isArray(result.contents) && 'value' in result.contents && result.contents.value) {
            hoverText = result.contents.value
          } else if (Array.isArray(result.contents)) {
            hoverText = result.contents
              .map((c) => (typeof c === 'string' ? c : (c as LeanHoverContents).value || ''))
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
        clientLogger.warn('MonacoEditor.provideHover', 'Hover request failed', { error })
      }

      return null
    }
  })

  decorationCollection = editorInstance.createDecorationsCollection([])

  editorInstance.onDidChangeCursorPosition((e) => {
    const newLine = e.position.lineNumber
    if (currentEditingLine.value !== newLine) {
      currentEditingLine.value = newLine
    }
    emit('cursorChange', { lineNumber: e.position.lineNumber, column: e.position.column })
  })

  editorInstance.onDidBlurEditorText(() => {
    if (currentEditingLine.value !== null) {
      currentEditingLine.value = null
    }
    emit('blur')
  })

  editorInstance.onDidChangeModelContent(() => {
    if (editorInstance) {
      emit('update:modelValue', editorInstance.getValue())
      emit('contentChange')
    }
  })

  isLoading.value = false
  emit('ready')
}

const getValue = () => editorInstance?.getValue() ?? ''

const setValue = (value: string) => {
  if (editorInstance && editorInstance.getValue() !== value) {
    const position = editorInstance.getPosition()
    editorInstance.setValue(value)
    if (position) {
      editorInstance.setPosition(position)
    }
  }
}

const focus = () => editorInstance?.focus()

const layout = () => editorInstance?.layout()

const updateOptions = async (options: {
  fontSize?: number
  wordWrap?: boolean
  minimap?: boolean
  lineNumbers?: boolean
  theme?: string
}): Promise<void> => {
  if (editorInstance) {
    const monaco = await import('monaco-editor')
    const updateConfig: MonacoEditorUpdateOptions = {
      fontSize: options.fontSize,
      wordWrap: options.wordWrap ? 'on' : 'off'
    }
    if (options.minimap !== undefined) {
      updateConfig.minimap = { enabled: options.minimap }
    }
    if (options.lineNumbers !== undefined) {
      updateConfig.lineNumbers = options.lineNumbers ? 'on' : 'off'
    }
    editorInstance.updateOptions(updateConfig)
    if (options.theme) {
      monaco.editor.setTheme(options.theme)
    }
  }
}

const setTheme = async (theme: string) => {
  const monaco = await import('monaco-editor')
  monaco.editor.setTheme(theme)
}

defineExpose({
  getValue,
  setValue,
  focus,
  layout,
  updateOptions,
  setTheme,
  updateEditorMarkers
})

onMounted(async () => {
  if (!import.meta.client) return
  await initializeMonaco()
})

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
      editorInstance.dispose()
      editorInstance = null
    }
  } catch (error) {
    clientLogger.error('MonacoEditor.onUnmounted', error)
  }
})

watch(() => props.modelValue, (newVal) => {
  if (editorInstance && editorInstance.getValue() !== newVal) {
    const position = editorInstance.getPosition()
    editorInstance.setValue(newVal)
    if (position) {
      editorInstance.setPosition(position)
    }
  }
})
</script>

<template>
  <div class="relative h-full w-full">
    <div v-if="isLoading" class="absolute inset-0 z-40 flex items-center justify-center bg-white dark:bg-gray-900">
      <div class="text-center">
        <UIcon name="tabler:loader" class="w-8 h-8 animate-spin text-primary mb-2" />
        <p class="text-sm text-gray-600 dark:text-gray-400">Loading editor...</p>
      </div>
    </div>
    <div ref="editorContainer" class="absolute inset-0 w-full h-full"></div>
  </div>
</template>

<style scoped>
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
