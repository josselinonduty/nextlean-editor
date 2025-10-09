<script setup lang="ts">
// Set page title
useSeoMeta({
  title: 'Lean Editor - NextLean'
})

// Container refs
const editorContainer = ref<HTMLElement>()
const infoviewContainer = ref<HTMLElement>()
const mainContainer = ref<HTMLElement>()

// Editor state
const isLoading = ref(true)
const isError = ref(false)
const errorMessage = ref('')
const code = ref(`-- Fibonacci Implementation in Lean 4

-- Recursive definition of Fibonacci sequence
def fib : Nat → Nat
  | 0 => 0
  | 1 => 1
  | n + 2 => fib (n + 1) + fib n

-- Tail-recursive optimized version
def fibTail (n : Nat) : Nat :=
  let rec fibAux (n : Nat) (a b : Nat) : Nat :=
    match n with
    | 0 => a
    | k + 1 => fibAux k b (a + b)
  fibAux n 0 1

-- Prove that both definitions are equivalent
theorem fib_eq_fibTail (n : Nat) : fib n = fibTail n := by
  induction n using Nat.strong_induction_on with
  | ind n ih =>
    unfold fibTail
    simp [fibTail.fibAux]
    cases n with
    | zero => simp [fib]
    | succ n =>
      cases n with
      | zero => simp [fib]
      | succ n =>
        simp [fib]
        sorry

-- Basic properties of Fibonacci numbers
theorem fib_pos (n : Nat) (h : 0 < n) : 0 < fib n := by
  cases n with
  | zero => contradiction
  | succ n =>
    cases n with
    | zero => simp [fib]
    | succ n => 
      simp [fib]
      exact Nat.add_pos_left (fib_pos (n + 1) (Nat.succ_pos n)) (fib n)

-- Evaluate some Fibonacci numbers
#eval fib 0    -- 0
#eval fib 1    -- 1
#eval fib 5    -- 5
#eval fib 10   -- 55
#eval fib 15   -- 610

-- Compare with tail-recursive version
#eval fibTail 10   -- 55
#eval fibTail 15   -- 610

-- Test larger numbers (tail-recursive is more efficient)
#eval fibTail 20   -- 6765
#eval fibTail 25   -- 75025

-- Prove a specific case
theorem fib_10 : fib 10 = 55 := by rfl
`)

// UI state
const fontSize = ref(14)
const theme = ref('vs-dark')
const fileName = ref('main.lean')
const isModified = ref(false)
const showInfoview = ref(true)
const infoviewWidth = ref(50)
const isResizing = ref(false)

// Lean analysis state
const leanAnalysis = ref({
  goalState: null as string | null,
  typeInfo: null as string | null,
  errors: [] as Array<{message: string, line: number}>,
  position: { line: 0, column: 0 },
  hoverPosition: null as { line: number, column: number } | null,
  isHovering: false,
  hasContent: false
})

// Infoview tabs configuration
const infoviewTabs = [
  {
    label: 'Lean',
    icon: 'tabler:math-function',
    slot: 'lean',
  },
  {
    label: 'Assistant',
    icon: 'tabler:robot',
    slot: 'assistant', 
  }
]
// Removed showInfoview since we use the AI panel in layout

// Editor instances
let editorInstance: any = null
let leanMonaco: any = null
let hoverTimeout: NodeJS.Timeout | null = null

// Initialize Monaco Editor with lean4monaco
onMounted(async () => {
  if (!import.meta.client) return
  
  try {
    isLoading.value = true
    
    if (!editorContainer.value) {
      throw new Error('Editor container not found')
    }

    // Try fallback editor first (more reliable)
    console.log('Initializing fallback Monaco editor...')
    await initializeFallbackEditor()
    
  } catch (error) {
    console.error('Failed to initialize any editor:', error)
    isError.value = true
    errorMessage.value = error instanceof Error ? error.message : 'Unknown error'
    isLoading.value = false
  }
})

// Fallback Monaco editor without lean4monaco
const initializeFallbackEditor = async () => {
  try {
    if (!editorContainer.value) {
      throw new Error('Editor container not available')
    }
    
    console.log('Loading Monaco Editor...')
    const monaco = await import('monaco-editor')
    
    // Configure Monaco editor worker - using the correct paths from vite static copy
    if (typeof window !== 'undefined') {
      // @ts-ignore
      window.MonacoEnvironment = {
        getWorkerUrl: function (moduleId: string, label: string) {
          if (label === 'json') {
            return '/monaco-editor/min/vs/language/json/json.worker.js';
          }
          if (label === 'css' || label === 'scss' || label === 'less') {
            return '/monaco-editor/min/vs/language/css/css.worker.js';
          }
          if (label === 'html' || label === 'handlebars' || label === 'razor') {
            return '/monaco-editor/min/vs/language/html/html.worker.js';
          }
          if (label === 'typescript' || label === 'javascript') {
            return '/monaco-editor/min/vs/language/typescript/ts.worker.js';
          }
          return '/monaco-editor/min/vs/editor/editor.worker.js';
        }
      };
    }
    
    // Basic Lean syntax highlighting
    if (!monaco.languages.getLanguages().some(lang => lang.id === 'lean')) {
      monaco.languages.register({ id: 'lean' })
      
      monaco.languages.setMonarchTokensProvider('lean', {
        tokenizer: {
          root: [
            [/--.*$/, 'comment'],
            [/\b(theorem|lemma|def|example|inductive|structure)\b/, 'keyword'],
            [/\b(by|have|show|from|apply|exact|rfl|simp)\b/, 'keyword.control'],
            [/\b(Type|Prop|Nat|Int|Bool|String)\b/, 'type'],
            [/\b(true|false)\b/, 'constant'],
            [/\b\d+\b/, 'number'],
            [/".*?"/, 'string'],
            [/[()[\]{}]/, 'bracket'],
            [/[,:;.]/, 'delimiter'],
            [/[=<>!&|+\-*/^~]/, 'operator'],
          ]
        }
      })
    }
    
    // Dispose existing editor if any
    if (editorInstance && editorInstance.dispose) {
      editorInstance.dispose()
    }
    
    console.log('Creating Monaco Editor instance...')
    editorInstance = monaco.editor.create(editorContainer.value, {
      value: code.value,
      language: 'lean',
      theme: theme.value,
      fontSize: fontSize.value,
      wordWrap: 'on',
      minimap: { enabled: true },
      lineNumbers: 'on',
      automaticLayout: false, // Disabled for better resize performance
      scrollBeyondLastLine: false,
      renderWhitespace: 'selection',
      tabSize: 2,
      insertSpaces: true,
    })
    
    console.log('Monaco Editor created:', editorInstance)
    console.log('Editor container dimensions:', {
      width: editorContainer.value.clientWidth,
      height: editorContainer.value.clientHeight,
      offsetWidth: editorContainer.value.offsetWidth,
      offsetHeight: editorContainer.value.offsetHeight
    })
    
    // Force layout after creation
    setTimeout(() => {
      if (editorInstance) {
        console.log('Forcing initial layout...')
        editorInstance.layout()
      }
    }, 100)
    
    // Add resize observer for container changes and mouse events
    if (editorContainer.value) {
      const resizeObserver = new ResizeObserver(() => {
        if (editorInstance && !isResizing.value) {
          editorInstance.layout()
        }
      })
      resizeObserver.observe(editorContainer.value)
      
      // Add mouse enter/leave events to container
      editorContainer.value.addEventListener('mouseenter', () => {
        isMouseInEditor = true
      })
      
      editorContainer.value.addEventListener('mouseleave', () => {
        isMouseInEditor = false
        if (hoverTimeout) {
          clearTimeout(hoverTimeout)
          hoverTimeout = null
        }
        
        // Clear hover state when leaving editor
        setTimeout(() => {
          if (!isMouseInEditor && leanAnalysis.value.isHovering) {
            leanAnalysis.value.isHovering = false
            leanAnalysis.value.hoverPosition = null
            updateLeanAnalysis()
          }
        }, 100)
      })
    }
    
    // Listen for changes
    editorInstance.onDidChangeModelContent(() => {
      code.value = editorInstance.getValue()
      isModified.value = true
      // Clear analysis when content changes
      updateLeanAnalysis()
    })
    
    // Listen for cursor position changes
    editorInstance.onDidChangeCursorPosition((e: any) => {
      leanAnalysis.value.position = {
        line: e.position.lineNumber,
        column: e.position.column
      }
      // Only update analysis if not hovering
      if (!leanAnalysis.value.isHovering) {
        updateLeanAnalysis()
      }
    })
    
    // Handle mouse hover with proper timeout management
    let isMouseInEditor = false
    
    // Listen for mouse hover
    editorInstance.onMouseMove((e: any) => {
      // Clear existing timeout
      if (hoverTimeout) {
        clearTimeout(hoverTimeout)
        hoverTimeout = null
      }
      
      if (e.target?.position) {
        leanAnalysis.value.hoverPosition = {
          line: e.target.position.lineNumber,
          column: e.target.position.column
        }
        leanAnalysis.value.isHovering = true
        updateLeanAnalysis(e.target.position)
        
        // Set timeout to clear hover state after 2 seconds of no movement
        hoverTimeout = setTimeout(() => {
          if (leanAnalysis.value.isHovering) {
            leanAnalysis.value.isHovering = false
            leanAnalysis.value.hoverPosition = null
            // Fall back to cursor position
            updateLeanAnalysis()
          }
        }, 5000)
      }
    })
    
    // Listen for mouse leave to stop hovering immediately
    editorInstance.onMouseLeave(() => {
      if (hoverTimeout) {
        clearTimeout(hoverTimeout)
        hoverTimeout = null
      }
      
      // Clear hover state when mouse leaves
      leanAnalysis.value.isHovering = false
      leanAnalysis.value.hoverPosition = null
      // Fall back to cursor position
      updateLeanAnalysis()
    })
    
    // Initialize infoview if container available
    // Note: Infoview content is now handled by Vue template with UTabs
    
    console.log('Monaco Editor initialized successfully')
    isError.value = false
    isLoading.value = false
    
  } catch (error) {
    console.error('Fallback editor failed:', error)
    errorMessage.value = `Failed to load any editor: ${error instanceof Error ? error.message : 'Unknown error'}`
    isError.value = true
    isLoading.value = false
  }
}

// Cleanup
onUnmounted(() => {
  try {
    if (editorInstance) {
      editorInstance.dispose?.()
      editorInstance = null
    }
    if (leanMonaco) {
      leanMonaco.dispose?.()
      leanMonaco = null
    }
    // Clean up resize listeners
    document.removeEventListener('mousemove', handleResize)
    document.removeEventListener('mouseup', stopResize)
    document.body.style.cursor = ''
    // Clear any pending animation frames
    if (resizeAnimationFrame) {
      cancelAnimationFrame(resizeAnimationFrame)
    }
    // Clear hover timeout
    if (hoverTimeout) {
      clearTimeout(hoverTimeout)
      hoverTimeout = null
    }
  } catch (error) {
    console.error('Cleanup error:', error)
  }
})

// File operations
const newFile = () => {
  const newContent = '-- New Lean file\n\n'
  if (editorInstance && editorInstance.setValue) {
    editorInstance.setValue(newContent)
  } else {
    code.value = newContent
  }
  fileName.value = 'untitled.lean'
  isModified.value = false
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
          if (editorInstance && editorInstance.setValue) {
            editorInstance.setValue(content)
          } else {
            code.value = content
          }
          fileName.value = file.name
          isModified.value = false
        }
      }
      reader.readAsText(file)
    }
  }
  input.click()
}

const saveFile = () => {
  let content = code.value
  if (editorInstance && editorInstance.getValue) {
    content = editorInstance.getValue()
  }
  
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName.value
  a.click()
  URL.revokeObjectURL(url)
  isModified.value = false
}

const toggleTheme = () => {
  theme.value = theme.value === 'vs-dark' ? 'vs-light' : 'vs-dark'
  if (editorInstance && editorInstance.updateOptions) {
    editorInstance.updateOptions({ theme: theme.value })
  }
}

const toggleInfoview = () => {
  showInfoview.value = !showInfoview.value
  
  // Restore infoview content when shown again  
  nextTick(() => {
    // Trigger editor layout update
    if (editorInstance && editorInstance.layout) {
      setTimeout(() => {
        editorInstance.layout()
      }, 100)
    }
  })
}

// Update Lean analysis based on cursor position or hover position
const updateLeanAnalysis = (position?: any) => {
  if (!editorInstance) {
    leanAnalysis.value.hasContent = false
    return
  }
  
  // Use provided position, hover position, or fall back to cursor position
  let currentPosition = position
  if (!currentPosition) {
    if (leanAnalysis.value.isHovering && leanAnalysis.value.hoverPosition) {
      currentPosition = {
        lineNumber: leanAnalysis.value.hoverPosition.line,
        column: leanAnalysis.value.hoverPosition.column
      }
    } else {
      currentPosition = editorInstance.getPosition()
    }
  }
  
  if (!currentPosition) {
    leanAnalysis.value.hasContent = false
    return
  }
  
  const model = editorInstance.getModel()
  if (!model) {
    leanAnalysis.value.hasContent = false
    return
  }
  
  const lineContent = model.getLineContent(currentPosition.lineNumber)
  const currentText = lineContent.trim()
  
  leanAnalysis.value.hasContent = currentText.length > 0
  
  // Update the position being analyzed
  const analyzedPosition = {
    line: currentPosition.lineNumber,
    column: currentPosition.column
  }
  
  if (leanAnalysis.value.hasContent) {
    leanAnalysis.value.goalState = analyzeGoalState(currentText, analyzedPosition)
    leanAnalysis.value.typeInfo = analyzeTypeInfo(currentText, analyzedPosition)
    leanAnalysis.value.errors = analyzeErrors(currentText, currentPosition.lineNumber)
  }
}

// Analyze goal state from line content
const analyzeGoalState = (text: string, position: { line: number, column: number }): string | null => {
  if (text.includes('theorem') || text.includes('lemma')) {
    return `⊢ ${extractGoalFromLine(text)}`
  }
  if (text.includes('by')) {
    return '⊢ Proof goal for current tactic'
  }
  if (text.includes('apply')) {
    return `⊢ Apply tactic: ${text.trim()}`
  }
  if (text.includes('exact')) {
    return `⊢ Exact proof: ${text.trim()}`
  }
  if (text.includes('rw') || text.includes('rewrite')) {
    return `⊢ Rewrite: ${text.trim()}`
  }
  if (text.includes('simp')) {
    return `⊢ Simplification: ${text.trim()}`
  }
  if (text.includes('intro')) {
    return `⊢ Introduction: ${text.trim()}`
  }
  if (text.includes('have')) {
    return `⊢ Have statement: ${text.trim()}`
  }
  if (text.includes('show')) {
    return `⊢ Show goal: ${text.trim()}`
  }
  return null
}

// Analyze type information from line content  
const analyzeTypeInfo = (text: string, position: { line: number, column: number }): string | null => {
  // Basic types
  const typeMap = {
    'Nat': 'Nat : Type (natural numbers)',
    'ℕ': 'Nat : Type (natural numbers)', 
    'Int': 'Int : Type (integers)',
    'ℤ': 'Int : Type (integers)',
    'String': 'String : Type (text strings)',
    'Bool': 'Bool : Type (boolean values)',
    'List': 'List : Type → Type (polymorphic lists)',
    'Option': 'Option : Type → Type (optional values)'
  }
  
  // Check for basic types
  for (const [key, value] of Object.entries(typeMap)) {
    if (text.includes(key)) return value
  }
  
  // Declaration types
  if (text.includes('theorem') || text.includes('lemma')) return 'Theorem : Prop (logical proposition)'
  if (text.includes('def ')) return 'Definition : Type → Type (function definition)'
  if (text.includes('example')) return 'Example : Prop (proof example)'
  if (text.includes('structure')) return 'Structure : Type (data structure)'
  if (text.includes('inductive')) return 'Inductive : Type (inductive type)'
  
  // Operators and symbols
  if (text.includes('=')) return 'Equality : α → α → Prop'
  if (text.includes('→') || text.includes('->')) return 'Function type'
  if (text.includes('∀') || text.includes('forall')) return 'Universal quantifier'
  if (text.includes('∃') || text.includes('exists')) return 'Existential quantifier'
  
  return null
}

// Analyze errors in line content
const analyzeErrors = (text: string, lineNumber: number): Array<{message: string, line: number}> => {
  const errors = []
  if (text.includes('theorem') && !text.includes(':')) {
    errors.push({
      message: 'Missing type annotation',
      line: lineNumber
    })
  }
  return errors
}

// Extract goal from theorem/lemma declaration
const extractGoalFromLine = (line: string): string => {
  if (line.includes(':')) {
    const parts = line.split(':')
    return parts[1]?.trim().replace(/\s*:=.*$/, '') || 'Unknown goal'
  }
  return 'Unknown goal'
}

// Optimized resize for maximum fluidity
let resizeAnimationFrame: number | null = null

// Resize functionality
const startResize = (event: MouseEvent) => {
  isResizing.value = true
  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
  document.body.style.cursor = 'col-resize'
  event.preventDefault()
}

const handleResize = (event: MouseEvent) => {
  if (!isResizing.value || !mainContainer.value) return
  
  // Cancel previous animation frame if it exists
  if (resizeAnimationFrame) {
    cancelAnimationFrame(resizeAnimationFrame)
  }
  
  // Use requestAnimationFrame for smooth 60fps updates
  resizeAnimationFrame = requestAnimationFrame(() => {
    if (!mainContainer.value) return
    
    const containerRect = mainContainer.value.getBoundingClientRect()
    const newInfoviewWidth = ((containerRect.right - event.clientX) / containerRect.width) * 100
    infoviewWidth.value = Math.max(20, Math.min(70, newInfoviewWidth))
    
    // Update editor layout immediately for fluid resize
    if (editorInstance && editorInstance.layout) {
      editorInstance.layout()
    }
  })
}

const stopResize = () => {
  isResizing.value = false
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
  document.body.style.cursor = ''
  
  // Clear any pending animation frame
  if (resizeAnimationFrame) {
    cancelAnimationFrame(resizeAnimationFrame)
    resizeAnimationFrame = null
  }
  
  // Clear any pending animation frame
  if (resizeAnimationFrame) {
    cancelAnimationFrame(resizeAnimationFrame)
    resizeAnimationFrame = null
  }
  
  // Final editor layout update after resize
  if (editorInstance && editorInstance.layout) {
    setTimeout(() => {
      editorInstance.layout()
    }, 100)
  }
}

const retryInitialization = async () => {
  isError.value = false
  errorMessage.value = ''
  isLoading.value = true
  
  // Clear existing instances
  if (editorInstance) {
    editorInstance.dispose?.()
    editorInstance = null
  }
  if (leanMonaco) {
    leanMonaco.dispose?.()
    leanMonaco = null
  }
  
  // Wait and retry
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  // Retry the mounted logic
  try {
    await initializeFallbackEditor()
  } catch (error) {
    console.error('Retry failed:', error)
  }
}

// Watch for font size changes
watch(fontSize, (newSize) => {
  if (editorInstance && editorInstance.updateOptions) {
    editorInstance.updateOptions({ fontSize: newSize })
  }
})

// Watch for layout changes to trigger editor layout update
watch(showInfoview, () => {
  nextTick(() => {
    if (editorInstance && editorInstance.layout) {
      setTimeout(() => {
        editorInstance.layout()
      }, 100)
    }
  })
})
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Editor Toolbar -->
    <div class="border-b border-gray-200 dark:border-gray-800 p-3 flex items-center justify-between bg-white dark:bg-gray-900">
      <div class="flex items-center gap-3">
        <!-- File Operations -->
        <UButton 
          icon="tabler:file-plus" 
          size="sm" 
          variant="ghost"
          @click="newFile"
          title="New File"
        />
        <UButton 
          icon="tabler:folder-open" 
          size="sm" 
          variant="ghost"
          @click="openFile"
          title="Open File"
        />
        <UButton 
          icon="tabler:device-floppy" 
          size="sm" 
          variant="ghost"
          @click="saveFile"
          title="Save File"
          :disabled="!isModified"
        />
        
        <div class="w-px h-6 bg-gray-300 dark:bg-gray-700"></div>
        
        <!-- View Operations -->
        <UButton 
          :icon="theme === 'vs-dark' ? 'tabler:sun' : 'tabler:moon'" 
          size="sm" 
          variant="ghost"
          @click="toggleTheme"
          :title="`Switch to ${theme === 'vs-dark' ? 'light' : 'dark'} theme`"
        />
        
        <UButton 
          :icon="showInfoview ? 'tabler:layout-sidebar-right-collapse' : 'tabler:layout-sidebar-right-expand'" 
          size="sm" 
          variant="ghost"
          @click="toggleInfoview"
          :title="`${showInfoview ? 'Hide' : 'Show'} infoview panel`"
        />
        
        <!-- Retry button for errors -->
        <UButton 
          v-if="isError"
          icon="tabler:refresh" 
          size="sm" 
          variant="ghost"
          color="warning"
          @click="retryInitialization"
          title="Retry Initialization"
        />
      </div>
      
      <!-- File Info and Settings -->
      <div class="flex items-center gap-3">
        <span class="text-sm text-gray-600 dark:text-gray-400">
          {{ fileName }}{{ isModified ? ' *' : '' }}
        </span>
      </div>
    </div>
    
    <!-- Error State -->
    <div 
      v-if="isError"
      class="p-4 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800"
    >
      <div class="flex items-center gap-3">
        <UIcon name="tabler:alert-circle" class="text-red-500" size="20" />
        <div>
          <h3 class="font-semibold text-red-800 dark:text-red-200">
            Failed to load Lean editor
          </h3>
          <p class="text-sm text-red-600 dark:text-red-300">
            {{ errorMessage }}. Using fallback Monaco editor.
          </p>
        </div>
        <UButton
          @click="retryInitialization"
          color="error"
          variant="outline"
          size="sm"
        >
          Retry
        </UButton>
      </div>
    </div>
    
    <div class="flex-1 flex relative">
      <div 
        ref="mainContainer"
        class="w-full h-full flex"
        :class="{ 'select-none': isResizing }"
      >
        <!-- Editor Panel -->
        <div 
          class="h-full relative bg-gray-900 transition-all duration-200"
          :style="showInfoview ? { width: (100 - infoviewWidth) + '%' } : { width: '100%' }"
        >
          <!-- Debug info -->
          <div 
            v-if="isLoading"
            class="absolute inset-0 flex items-center justify-center bg-gray-800 text-white z-10"
          >
            <div class="text-center">
              <UIcon name="tabler:loader-2" class="animate-spin mb-2" size="24" />
              <p>Loading Monaco Editor...</p>
            </div>
          </div>
          
          <!-- Error state for editor container -->
          <div 
            v-if="isError && !isLoading"
            class="absolute inset-0 flex items-center justify-center bg-gray-800 text-white z-10"
          >
            <div class="text-center">
              <UIcon name="tabler:alert-circle" class="mb-2 text-red-400" size="24" />
              <p>{{ errorMessage }}</p>
              <UButton @click="retryInitialization" class="mt-2" size="sm">Retry</UButton>
            </div>
          </div>
          
          <div 
            ref="editorContainer" 
            class="w-full h-full monaco-editor-container"
            style="min-height: 400px;"
          />
        </div>
        
        <!-- Resizer (only shown when infoview is visible) -->
        <div
          v-if="showInfoview"
          class="relative w-0.5 h-full flex items-center justify-center cursor-col-resize group"
          @mousedown="startResize"
        >
          <!-- Visual resize line -->
          <div 
            class="w-px h-full bg-gray-300 dark:bg-gray-600 transition-all duration-150 group-hover:w-0.5 group-hover:bg-blue-500 dark:group-hover:bg-blue-400"
            :class="{ 'w-0.5 bg-blue-500 dark:bg-blue-400 shadow-lg': isResizing }"
          />
        </div>
        
        <!-- Infoview Panel -->
        <div 
          v-if="showInfoview"
          ref="infoviewContainer" 
          class="h-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 transition-all duration-200"
          :style="{ width: infoviewWidth + '%' }"
        >
          <div class="h-full flex flex-col p-2">
            <UTabs 
              :items="infoviewTabs"
              class="w-full h-full"
              :ui="{ content: 'focus:outline-none w-full h-full flex items-center justify-center' }"
            >
            
              <!-- Lean Tab Content -->
              <template #lean>
                <div 
                  class="h-full w-full flex flex-col items-center justify-center"
                >
                  <div class="flex-1 text-sm overflow-auto w-full h-full">
                    <!-- When no analysis available -->
                    <div v-if="!leanAnalysis.hasContent" class="h-full flex items-center justify-center">
                      <div class="text-center text-gray-500 dark:text-gray-400 space-y-2">
                        <UIcon name="tabler:cursor-text" class="w-8 h-8 mx-auto" />
                        <p class="text-sm">Position cursor or hover in the editor</p>
                        <p class="text-xs">to see Lean analysis</p>
                        <div class="text-xs text-gray-400 dark:text-gray-500 mt-4 space-y-1">
                          <div class="flex items-center justify-center gap-2">
                            <UIcon name="tabler:mouse" class="w-3 h-3" />
                            <span>Hover for instant analysis</span>
                          </div>
                          <div class="flex items-center justify-center gap-2">
                            <UIcon name="tabler:cursor-text" class="w-3 h-3" />
                            <span>Cursor position as fallback</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div v-else class="space-y-4">
                      <!-- Position indicator -->
                      <div class="text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 pb-2">
                        <div class="flex items-center justify-between">
                          <span>
                            Line {{ leanAnalysis.isHovering && leanAnalysis.hoverPosition ? 
                              leanAnalysis.hoverPosition.line : leanAnalysis.position.line }}, 
                            Column {{ leanAnalysis.isHovering && leanAnalysis.hoverPosition ? 
                              leanAnalysis.hoverPosition.column : leanAnalysis.position.column }}
                          </span>
                          <span class="flex items-center gap-1">
                            <UIcon 
                              :name="leanAnalysis.isHovering ? 'tabler:mouse' : 'tabler:cursor-text'" 
                              class="w-3 h-3"
                              :class="leanAnalysis.isHovering ? 'text-blue-500' : 'text-gray-400'"
                            />
                            <span class="text-xs">
                              {{ leanAnalysis.isHovering ? 'hover' : 'cursor' }}
                            </span>
                          </span>
                        </div>
                      </div>
                      
                      <div v-if="leanAnalysis.goalState" class="space-y-2">
                        <div class="flex items-center gap-2">
                          <UIcon name="tabler:target" class="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <h3 class="font-medium text-blue-800 dark:text-blue-200">Goal State</h3>
                        </div>
                        <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                          <pre class="text-xs font-mono text-blue-800 dark:text-blue-200 whitespace-pre-wrap">{{ leanAnalysis.goalState }}</pre>
                        </div>
                      </div>
                      
                      <div v-if="leanAnalysis.typeInfo" class="space-y-2">
                        <div class="flex items-center gap-2">
                          <UIcon name="tabler:info-circle" class="w-4 h-4 text-green-600 dark:text-green-400" />
                          <h3 class="font-medium text-green-800 dark:text-green-200">Type Information</h3>
                        </div>
                        <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                          <pre class="text-xs font-mono text-green-800 dark:text-green-200 whitespace-pre-wrap">{{ leanAnalysis.typeInfo }}</pre>
                        </div>
                      </div>
                      
                      <div v-if="leanAnalysis.errors.length > 0" class="space-y-2">
                        <div class="flex items-center gap-2">
                          <UIcon name="tabler:alert-circle" class="w-4 h-4 text-red-600 dark:text-red-400" />
                          <h3 class="font-medium text-red-800 dark:text-red-200">Errors</h3>
                        </div>
                        <div class="space-y-2">
                          <div 
                            v-for="(error, index) in leanAnalysis.errors" 
                            :key="index"
                            class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3"
                          >
                            <div class="flex items-start gap-2">
                              <span class="text-xs text-red-500 dark:text-red-400 font-mono">{{ error.line }}:</span>
                              <pre class="text-xs font-mono text-red-800 dark:text-red-200 whitespace-pre-wrap flex-1">{{ error.message }}</pre>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
              
              <!-- Assistant Tab Content -->
              <template #assistant>
                <div 
                  class="h-full w-full flex flex-col items-center justify-center"
                >
                  <div class="flex-1 p-4 flex items-center justify-center w-full h-full">
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
    </div>
    
    <!-- Status Bar -->
    <div class="border-t border-gray-200 dark:border-gray-800 px-3 py-2 bg-gray-50 dark:bg-gray-900 flex items-center justify-between text-sm">
      <div class="flex items-center gap-4">
        <span class="text-gray-600 dark:text-gray-400">
          {{ isError ? 'Lean 4 (Fallback)' : 'Lean 4' }}
        </span>
        <span class="text-gray-600 dark:text-gray-400">
          UTF-8
        </span>
        <span 
          v-if="!isLoading && !isError" 
          class="text-green-600 dark:text-green-400 flex items-center gap-1"
        >
          <UIcon name="tabler:circle-check" size="12" />
          Connected
        </span>
        <span 
          v-else-if="isError" 
          class="text-orange-600 dark:text-orange-400 flex items-center gap-1"
        >
          <UIcon name="tabler:alert-triangle" size="12" />
          Fallback Mode
        </span>
      </div>
      
      <div class="flex items-center gap-4">
        <span class="text-gray-600 dark:text-gray-400">
          {{ fileName }}
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

.monaco-editor-container .monaco-editor {
  height: 100% !important;
}

.monaco-editor-container .monaco-editor .view-lines {
  font-family: 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'DejaVu Sans Mono', 'Bitstream Vera Sans Mono', 'Courier New', monospace;
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

.select-none .monaco-editor {
  pointer-events: auto;
}

/* Hardware acceleration for smooth resize */
.monaco-editor-container,
[ref="infoviewContainer"] {
  will-change: width;
  transform: translateZ(0);
}

/* Smooth width transitions during resize */
.resize-smooth {
  transition: width 0ms ease-out;
}
</style>
