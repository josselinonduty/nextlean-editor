<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

useSeoMeta({
  title: 'Settings - NextLean'
})

const { settings, updateSettings, resetSettings } = useSettings()
const toast = useToast()

const settingsSchema = z.object({
  editorFontSize: z.coerce.number()
    .min(10, 'Font size must be at least 10px')
    .max(32, 'Font size must be at most 32px'),
  editorTheme: z.enum(['vs-dark', 'vs-light']),
  editorWordWrap: z.boolean(),
  editorMinimap: z.boolean(),
  editorLineNumbers: z.boolean(),
})

type SettingsFormData = z.infer<typeof settingsSchema>

const formState = reactive<SettingsFormData>({
  editorFontSize: settings.value.editorFontSize,
  editorTheme: settings.value.editorTheme,
  editorWordWrap: settings.value.editorWordWrap,
  editorMinimap: settings.value.editorMinimap,
  editorLineNumbers: settings.value.editorLineNumbers,
})

watch(settings, (newSettings) => {
  Object.assign(formState, newSettings)
}, { deep: true })

const handleSubmit = (event: FormSubmitEvent<SettingsFormData>) => {
  updateSettings(event.data)
  toast.add({
    title: 'Settings saved',
    description: 'Your preferences have been updated successfully.',
    color: 'success',
    icon: 'tabler:check'
  })
}

const handleReset = () => {
  if (confirm('Are you sure you want to reset all settings to default?')) {
    resetSettings()
    toast.add({
      title: 'Settings reset',
      description: 'All settings have been restored to defaults.',
      color: 'info',
      icon: 'tabler:refresh'
    })
  }
}

const themeOptions = [
  { label: 'Dark (Visual Studio)', value: 'vs-dark' },
  { label: 'Light (Visual Studio)', value: 'vs-light' }
]
</script>

<template>
  <div class="h-full overflow-y-auto">
    <div class="p-8 max-w-4xl mx-auto space-y-8">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p class="text-gray-600 dark:text-gray-400 mt-1">
          Customize your editor and AI assistant preferences.
        </p>
      </div>
      <div class="flex gap-3">
        <UButton
          color="neutral"
          variant="ghost"
          icon="tabler:refresh"
          @click="handleReset"
        >
          Reset Defaults
        </UButton>
      </div>
    </div>

    <UForm :schema="settingsSchema" :state="formState" @submit="handleSubmit" class="space-y-6">
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="tabler:code" class="text-xl text-primary-500" />
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Editor</h2>
          </div>
        </template>

        <div class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <UFormField name="editorTheme" label="Theme" help="Choose your preferred color theme">
              <USelect
                v-model="formState.editorTheme"
                :items="themeOptions"
                option-attribute="label"
                value-attribute="value"
              />
            </UFormField>

            <UFormField name="editorFontSize" label="Font Size" help="Editor font size in pixels">
              <UInput
                v-model.number="formState.editorFontSize"
                type="number"
                min="10"
                max="32"
              >
                <template #trailing>
                  <span class="text-gray-500 text-xs">px</span>
                </template>
              </UInput>
            </UFormField>
          </div>

          <div class="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-800">
            <UFormField name="editorWordWrap">
              <div class="flex items-center justify-between">
                <div class="space-y-0.5">
                  <div class="text-sm font-medium text-gray-900 dark:text-white">Word Wrap</div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">Wrap long lines to fit the viewport</div>
                </div>
                <USwitch v-model="formState.editorWordWrap" />
              </div>
            </UFormField>

            <UFormField name="editorMinimap">
              <div class="flex items-center justify-between">
                <div class="space-y-0.5">
                  <div class="text-sm font-medium text-gray-900 dark:text-white">Minimap</div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">Show a code overview on the right</div>
                </div>
                <USwitch v-model="formState.editorMinimap" />
              </div>
            </UFormField>

            <UFormField name="editorLineNumbers">
              <div class="flex items-center justify-between">
                <div class="space-y-0.5">
                  <div class="text-sm font-medium text-gray-900 dark:text-white">Line Numbers</div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">Show line numbers in the gutter</div>
                </div>
                <USwitch v-model="formState.editorLineNumbers" />
              </div>
            </UFormField>
          </div>
        </div>

        <template #footer>
          <div class="flex justify-end">
            <UButton type="submit" color="primary" icon="tabler:device-floppy">
              Save Changes
            </UButton>
          </div>
        </template>
      </UCard>

      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="tabler:robot" class="text-xl text-primary-500" />
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">AI Assistant</h2>
          </div>
        </template>
      </UCard>
    </UForm>
  </div>
  </div>
</template>
