<script setup lang="ts">
import type { SavedProof } from '#shared/types'
import { clientLogger } from '#shared/utils/logger'

useSeoMeta({
  title: 'Proofs - NextLean'
})

const toast = useToast()
const { proofs, loading, error, fetchProofs, deleteProof } = useProofs()
const selectedProof = ref<SavedProof | null>(null)
const showModal = ref(false)
const searchQuery = ref('')
const selectedTag = ref<string | null>(null)

const normalizedSearch = computed(() => searchQuery.value.trim().toLowerCase())

const filteredProofs = computed(() => {
  const term = normalizedSearch.value
  return proofs.value.filter((proof) => {
    const matchesSearch = term === '' ||
      proof.title.toLowerCase().includes(term) ||
      proof.content.toLowerCase().includes(term) ||
      proof.tags.some(tag => tag.toLowerCase().includes(term))

    const matchesTag = selectedTag.value === null || proof.tags.includes(selectedTag.value)

    return matchesSearch && matchesTag
  })
})

const allTags = computed(() => {
  const tags = new Set<string>()
  for (const proof of proofs.value) {
    for (const tag of proof.tags) {
      tags.add(tag)
    }
  }
  return Array.from(tags).sort()
})

onMounted(async () => {
  try {
    await fetchProofs()
  } catch (err) {
    clientLogger.error('proofs.onMounted', err)
    toast.add({
      title: 'Failed to load proofs',
      description: 'Could not fetch proofs from the server. Please try again.',
      color: 'error'
    })
  }
})

const selectProof = (proof: SavedProof) => {
  selectedProof.value = proof
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  selectedProof.value = null
}

const handleDelete = async (id: string) => {
  if (confirm('Are you sure you want to delete this proof?')) {
    try {
      await deleteProof(id)
      if (selectedProof.value?.id === id) {
        closeModal()
      }
      toast.add({
        title: 'Proof deleted',
        description: 'The proof has been successfully deleted.',
        color: 'success'
      })
    } catch (err) {
      clientLogger.error('proofs.handleDelete', err)
      toast.add({
        title: 'Delete failed',
        description: 'Could not delete the proof. Please try again.',
        color: 'error'
      })
    }
  }
}

const handleLoadProof = (proof?: SavedProof | null) => {
  const target = proof || selectedProof.value
  if (target) {
    navigateTo(`/editor?proofId=${target.id}&content=${encodeURIComponent(target.content)}`)
  }
}

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<template>
  <div class="h-full overflow-y-auto">
    <div class="p-8 space-y-8">
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <div class="space-y-2">
          <h1 class="text-4xl font-bold text-gray-900 dark:text-white">
            Saved Proofs
          </h1>
          <p class="text-gray-600 dark:text-gray-400">
            Browse and manage all your mathematical proofs
          </p>
        </div>
        <NuxtLink to="/editor">
          <UButton icon="tabler:plus" size="md" color="primary">
            New Proof
          </UButton>
        </NuxtLink>
      </div>
    </div>

    <div class="space-y-4">
      <UInput
        v-model="searchQuery"
        icon="tabler:search"
        placeholder="Search by title, content, or tags..."
        size="lg"
      />

      <div v-if="allTags.length > 0" class="space-y-3">
        <p class="text-sm font-medium text-gray-700 dark:text-gray-300">Filter by tags</p>
        <div class="flex flex-wrap gap-2">
          <UButton
            v-for="tag in allTags"
            :key="tag"
            :variant="selectedTag === tag ? 'solid' : 'soft'"
            :color="selectedTag === tag ? 'primary' : 'neutral'"
            size="xs"
            @click="selectedTag = selectedTag === tag ? null : tag"
          >
            {{ tag }}
          </UButton>
        </div>
      </div>
    </div>

    <div v-if="error" class="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
      <div class="flex items-center gap-3">
        <UIcon name="tabler:alert-circle" class="text-lg text-red-600 dark:text-red-400" />
        <p class="text-red-700 dark:text-red-200">{{ error }}</p>
      </div>
    </div>

    <div v-if="loading" class="flex flex-col items-center justify-center py-16 space-y-4">
      <UIcon name="tabler:loader-2" class="text-4xl animate-spin text-primary" />
      <p class="text-gray-600 dark:text-gray-400">Loading proofs...</p>
    </div>

    <div v-else-if="proofs.length === 0" class="rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 p-12 text-center">
      <div class="space-y-4">
        <UIcon name="tabler:inbox" class="text-6xl text-gray-400 dark:text-gray-600 mx-auto" />
        <div>
          <p class="text-xl font-semibold text-gray-900 dark:text-white">No proofs yet</p>
          <p class="text-gray-600 dark:text-gray-400 mt-1">
            Start writing Lean proofs in the editor and save them to see them here.
          </p>
        </div>
        <NuxtLink to="/editor">
          <UButton icon="tabler:pencil" color="primary" size="md">
            Go to Editor
          </UButton>
        </NuxtLink>
      </div>
    </div>

    <div v-else-if="filteredProofs.length === 0" class="rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 p-12 text-center">
      <div class="space-y-4">
        <UIcon name="tabler:search-off" class="text-6xl text-gray-400 dark:text-gray-600 mx-auto" />
        <p class="text-gray-600 dark:text-gray-400">No proofs match your search or filters</p>
        <UButton variant="soft" @click="searchQuery = ''; selectedTag = null">
          Clear filters
        </UButton>
      </div>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <UCard
        v-for="proof in filteredProofs"
        :key="proof.id"
        class="hover:ring-2 hover:ring-primary-500/50 transition-all cursor-pointer group"
        :ui="{ body: { padding: 'p-0 sm:p-0' }, header: { padding: 'p-4 sm:p-4' }, footer: { padding: 'p-3 sm:p-3' } }"
        @click="selectProof(proof)"
      >
        <template #header>
          <div class="space-y-1">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white truncate group-hover:text-primary transition-colors">
              {{ proof.title }}
            </h3>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              {{ formatDate(proof.updatedAt) }}
            </p>
          </div>
        </template>

        <div class="p-4 space-y-3">
          <p class="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 font-mono bg-gray-50 dark:bg-gray-900/50 p-2 rounded">
            {{ proof.content.substring(0, 150) }}{{ proof.content.length > 150 ? '...' : '' }}
          </p>

          <div v-if="proof.tags && proof.tags.length > 0" class="flex flex-wrap gap-2">
            <UBadge
              v-for="tag in proof.tags.slice(0, 3)"
              :key="tag"
              variant="subtle"
              color="neutral"
              size="xs"
            >
              {{ tag }}
            </UBadge>
            <UBadge
              v-if="proof.tags.length > 3"
              variant="subtle"
              color="neutral"
              size="xs"
            >
              +{{ proof.tags.length - 3 }}
            </UBadge>
          </div>
        </div>

        <template #footer>
          <div class="flex gap-2 justify-end">
            <UButton
              color="primary"
              variant="ghost"
              size="xs"
              icon="tabler:pencil"
              @click.stop="handleLoadProof(proof)"
            >
              Edit
            </UButton>
            <UButton
              color="neutral"
              variant="ghost"
              size="xs"
              icon="tabler:chevron-right"
              @click.stop="selectProof(proof)"
            >
              View
            </UButton>
          </div>
        </template>
      </UCard>
    </div>

    <USlideover v-model:open="showModal" title="Proof Details" side="right">
      <template #content>
        <div v-if="selectedProof" class="flex flex-col h-full">
          <div class="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <h2 class="text-xl font-bold text-gray-900 dark:text-white">
              {{ selectedProof.title }}
            </h2>
            <UButton color="neutral" variant="ghost" icon="tabler:x" size="sm" @click="closeModal" />
          </div>

          <div class="flex-1 overflow-y-auto p-4 space-y-6">
            <div class="space-y-2">
              <p class="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Last Updated</p>
              <p class="text-sm text-gray-700 dark:text-gray-300">
                {{ formatDate(selectedProof.updatedAt) }}
              </p>
            </div>

            <div v-if="selectedProof.tags && selectedProof.tags.length > 0" class="space-y-3">
              <p class="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Tags</p>
              <div class="flex flex-wrap gap-2">
                <UBadge
                  v-for="tag in selectedProof.tags"
                  :key="tag"
                  variant="subtle"
                  color="primary"
                  size="xs"
                >
                  {{ tag }}
                </UBadge>
              </div>
            </div>

            <div class="space-y-2">
              <p class="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Content</p>
              <div class="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800 max-h-96 overflow-y-auto">
                <pre class="text-sm font-mono text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">{{ selectedProof.content }}</pre>
              </div>
            </div>
          </div>

          <div class="p-4 border-t border-gray-200 dark:border-gray-800 flex gap-2">
            <UButton
              block
              class="flex-1"
              color="primary"
              icon="tabler:edit"
              @click="handleLoadProof(selectedProof)"
            >
              Open in Editor
            </UButton>
            <UButton
              color="error"
              variant="soft"
              icon="tabler:trash"
              @click="handleDelete(selectedProof.id)"
            >
              Delete
            </UButton>
          </div>
        </div>
      </template>
    </USlideover>
  </div>
  </div>
</template>
