<script setup lang="ts">
import type { Diagnostic } from '#shared/types/lsp'

interface LeanError {
  message: string
  raw: unknown
}

interface Props {
  diagnostics: Diagnostic[]
  goals: string | null
  errors: LeanError[]
  width: number
}

defineProps<Props>()
const emit = defineEmits<{
  resize: [width: number]
}>()

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
</script>

<template>
  <div
    class="shrink-0 border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col overflow-hidden h-full"
    :style="{ width: `${width}%` }">
    <UTabs :items="infoviewTabs" class="w-full h-full flex flex-col"
      :ui="{ root: 'h-full flex flex-col bg-white dark:bg-gray-900', list: 'flex-none bg-gray-50 dark:bg-gray-950 rounded-none', content: 'flex-1 min-h-0 overflow-hidden' }">
      <template #lean>
        <div class="h-full w-full flex flex-col overflow-hidden">
          <div class="flex-1 min-h-0 p-4 overflow-y-auto">
              <UAccordion :items="[
                {
                  label: 'Diagnostics',
                  icon: 'tabler:alert-circle',
                  badge: diagnostics.length > 0 ? diagnostics.length : undefined,
                  slot: 'diagnostics'
                },
                {
                  label: 'Server Errors',
                  icon: 'tabler:bug',
                  badge: errors.length > 0 ? errors.length : undefined,
                  slot: 'errors'
                }
              ].filter(item => item.slot !== 'errors' || errors.length > 0)" type="multiple"
                :default-value="['0']">
                <template #diagnostics>
                  <div v-if="diagnostics.length > 0" class="space-y-2">
                    <div v-for="(diag, idx) in diagnostics" :key="idx"
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
                  <div v-if="errors.length > 0" class="space-y-2">
                    <div v-for="(error, idx) in errors" :key="idx"
                      class="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-xs">
                      <div class="text-red-600 dark:text-red-300 wrap-break-word font-mono">
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
                <div v-if="goals"
                  class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg font-mono text-xs whitespace-pre-wrap">
                  {{ goals }}
                </div>
                <div v-else class="text-xs text-gray-500 italic">
                  No goals at cursor position
                </div>
              </div>
            </div>
          </div>
        </template>

        <template #assist>
          <div class="h-full w-full flex flex-col overflow-hidden">
            <AssistantChatPanel class="h-full" />
          </div>
        </template>
      </UTabs>
  </div>
</template>
