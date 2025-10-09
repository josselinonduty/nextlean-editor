<script setup lang="ts">
export const useLean4Monaco = () => {
  const editorInstance = ref<any>(null)
  const leanMonacoInstance = ref<any>(null)
  const isLoading = ref(true)
  const leanVersion = ref<string>('Lean 4')
  const error = ref<string | null>(null)
  const infoviewInstance = ref<HTMLElement | null>(null)

  const initializeEditor = async (
    editorContainer: HTMLElement,
    infoviewContainer?: HTMLElement,
    filePath: string = '/project/main.lean',
    initialContent: string = '-- Lean 4 code here\n'
  ) => {
    if (!import.meta.client) {
      console.warn('Editor can only be initialized on client side')
      return
    }

    try {
      isLoading.value = true
      error.value = null

      const { LeanMonaco, LeanMonacoEditor } = await import('lean4monaco')

      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsHost = window.location.hostname
      const wsPort = 3001

      const options = {
        websocket: {
          url: `${wsProtocol}//${wsHost}:${wsPort}`
        },
        htmlElement: editorContainer,
        vscode: {
          'editor.wordWrap': 'on',
          'editor.fontSize': 14,
          'editor.lineNumbers': 'on',
          'editor.minimap.enabled': true,
          'editor.automaticLayout': true
        }
      }

      const leanMonaco = new LeanMonaco()
      leanMonacoInstance.value = leanMonaco

      if (infoviewContainer) {
        leanMonaco.setInfoviewElement(infoviewContainer)
        infoviewInstance.value = infoviewContainer
      }

      await leanMonaco.start(options)

      const leanMonacoEditor = new LeanMonacoEditor()
      await leanMonacoEditor.start(editorContainer, filePath, initialContent)

      editorInstance.value = leanMonacoEditor

      leanVersion.value = 'Lean 4 (Connected)'
      isLoading.value = false

      return { editor: leanMonacoEditor, infoview: infoviewContainer, leanMonaco }
    } catch (err) {
      console.error('Failed to initialize Lean4Monaco:', err)
      error.value = err instanceof Error ? err.message : 'Unknown error'
      leanVersion.value = 'Lean 4 (error)'
      isLoading.value = false
      throw err
    }
  }

  const dispose = () => {
    try {
      if (editorInstance.value && editorInstance.value.dispose) {
        editorInstance.value.dispose()
        editorInstance.value = null
      }
      if (leanMonacoInstance.value && leanMonacoInstance.value.dispose) {
        leanMonacoInstance.value.dispose()
        leanMonacoInstance.value = null
      }
      if (infoviewInstance.value) {
        infoviewInstance.value.innerHTML = ''
        infoviewInstance.value = null
      }
    } catch (err) {
      console.warn('Error during disposal:', err)
    }
  }

  return {
    editorInstance: readonly(editorInstance),
    leanMonacoInstance: readonly(leanMonacoInstance),
    infoviewInstance: readonly(infoviewInstance),
    isLoading: readonly(isLoading),
    leanVersion: readonly(leanVersion),
    error: readonly(error),
    initializeEditor,
    dispose
  }
}
</script>
