<script setup lang="ts">
import type { SavedProof } from '#shared/types'
import { clientLogger } from '#shared/utils/logger'

interface ProofLike {
  id: string
  title: string
  content: string
  tags: readonly string[] | string[]
  createdAt: number
  updatedAt: number
}

interface Props {
  open: boolean
  currentEditorContent: string
  currentProofId: string | null
}

interface Emits {
  (e: 'update:open', value: boolean): void
  (e: 'load', proof: SavedProof): void
  (e: 'saved', proof: SavedProof): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const toast = useToast()
const { proofs, loading: proofsLoading, error: proofsError, fetchProofs, createProof, updateProof } = useProofs()

const proofTitle = ref('')
const proofTags = ref<string[]>([])
const isSaving = ref(false)
const selectedProofForUpdate = ref<string | null>(null)
const hasLoadedProofs = ref(false)
const proofSearch = ref('')

const isOpen = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value)
})

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

const handleSaveProof = async () => {
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
    const content = props.currentEditorContent
    const payloadTags = proofTags.value

    const wasUpdate = isUpdateMode.value && props.currentProofId !== null

    const result = props.currentProofId && wasUpdate
      ? await updateProof(props.currentProofId, {
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
      selectedProofForUpdate.value = result.id
      proofTitle.value = result.title
      proofTags.value = [...result.tags]
      isOpen.value = false
      toast.add({
        title: wasUpdate ? 'Proof updated' : 'Proof saved',
        description: 'Your proof is available in the library tab.',
        color: 'success'
      })
      hasLoadedProofs.value = true
      emit('saved', result)
    }
  } catch (error) {
    clientLogger.error('ProofLibrarySlideover.handleSave', error)
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

const prepareUpdate = async (proof: ProofLike) => {
  await ensureProofsLoaded()
  proofTitle.value = proof.title
  proofTags.value = [...proof.tags]
  selectedProofForUpdate.value = proof.id
}

const prepareCreate = async () => {
  await ensureProofsLoaded()
  resetSaveState()
}

const loadProofIntoEditor = (proof: ProofLike) => {
  const mutableProof: SavedProof = {
    id: proof.id,
    title: proof.title,
    content: proof.content,
    tags: [...proof.tags],
    createdAt: proof.createdAt,
    updatedAt: proof.updatedAt
  }
  emit('load', mutableProof)
  toast.add({
    title: 'Proof loaded',
    description: 'You can continue editing this proof.',
    color: 'info'
  })
  isOpen.value = false
}

const copyProofContent = async (proof: ProofLike) => {
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
  } catch (error) {
    clientLogger.error('ProofLibrarySlideover.copyProofContent', error)
    toast.add({
      title: 'Copy failed',
      description: 'Unable to copy proof content.',
      color: 'error'
    })
  }
}

const initializeFromCurrentProof = (proofId: string) => {
  const existing = proofs.value.find(proof => proof.id === proofId)
  if (existing) {
    proofTitle.value = existing.title
    proofTags.value = [...existing.tags]
    selectedProofForUpdate.value = existing.id
  }
}

defineExpose({
  ensureProofsLoaded,
  prepareUpdate,
  prepareCreate,
  resetSaveState,
  initializeFromCurrentProof
})

watch(isOpen, async (open) => {
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
  <USlideover v-model:open="isOpen" title="Proof Library" side="right"
    :ui="{ content: 'max-w-lg w-full bg-white dark:bg-gray-950' }">
    <template #content>
      <div class="flex flex-col h-full">
        <div class="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            {{ isUpdateMode ? 'Update Proof' : 'Save Proof' }}
          </h3>
          <UButton color="neutral" variant="ghost" icon="tabler:x" @click="isOpen = false" aria-label="Close panel" />
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
                <UInput placeholder="Add tags..." @keydown.enter.prevent="(e: KeyboardEvent) => {
                  const target = e.target as HTMLInputElement
                  const val = target.value.trim()
                  if (val && !proofTags.includes(val)) {
                    proofTags.push(val)
                    target.value = ''
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
              class="mb-3" aria-label="Search proofs" />

            <div v-if="proofsLoading" class="flex justify-center py-4">
              <UIcon name="tabler:loader" class="animate-spin text-gray-400" />
            </div>

            <div v-else-if="filteredLibraryProofs.length === 0" class="text-center py-4 text-sm text-gray-500">
              No proofs found
            </div>

            <ul v-else class="space-y-2 max-h-60 overflow-y-auto pr-1 list-none m-0 p-0" aria-label="Saved proofs">
              <li v-for="proof in filteredLibraryProofs" :key="proof.id"
                class="p-3 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-primary-500 dark:hover:border-primary-500 transition-colors group"
                :class="{ 'bg-primary-50 dark:bg-primary-900/10 border-primary-200 dark:border-primary-800': selectedProofForUpdate === proof.id }">
                <div class="flex justify-between items-start mb-1">
                  <h5 class="text-sm font-medium text-gray-900 dark:text-white truncate pr-2">{{ proof.title }}</h5>
                  <div class="flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    <UButton size="xs" variant="ghost" color="info" icon="tabler:edit" @click.stop="prepareUpdate(proof)" aria-label="Edit proof metadata">
                      Edit</UButton>
                  </div>
                </div>
                <ul class="flex flex-wrap gap-1 mb-2 list-none m-0 p-0" aria-label="Tags">
                  <li v-for="tag in proof.tags.slice(0, 3)" :key="tag"
                    class="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-gray-600 dark:text-gray-400">
                    {{ tag }}
                  </li>
                </ul>
                <div class="flex justify-between items-center mt-2">
                  <span class="text-[10px] text-gray-400">
                    {{ new Date(proof.updatedAt).toLocaleDateString() }}
                  </span>
                  <div class="flex gap-2">
                    <UButton size="xs" variant="soft" color="neutral" icon="tabler:upload"
                      @click.stop="loadProofIntoEditor(proof)" aria-label="Load proof into editor">
                      Load
                    </UButton>
                    <UButton size="xs" variant="ghost" color="neutral" icon="tabler:copy"
                      @click.stop="copyProofContent(proof)" aria-label="Copy proof content to clipboard" />
                  </div>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </template>
  </USlideover>
</template>
