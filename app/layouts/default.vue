
<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const sidebarCollapsed = ref(false)

const route = useRoute()
const pageTitle = computed(() => {
  return (route.meta?.title as string) || 'NextLean'
})

const navigationItems = computed<NavigationMenuItem[][]>(() => [[
  {
    label: 'Editor',
    icon: 'tabler:code',
    to: '/editor',
    active: route.path === '/editor'
  },
  {
    label: 'Chat',
    icon: 'tabler:message-circle',
    to: '/chat',
    active: route.path === '/chat'
  },
  {
    label: 'Proofs',
    icon: 'tabler:file-text',
    to: '/proofs',
    active: route.path === '/proofs'
  }
]])

const footerItems = computed<NavigationMenuItem[][]>(() => [[
  {
    label: 'Settings',
    icon: 'tabler:settings',
    to: '/settings',
    active: route.path === '/settings'
  },
  {
    label: 'Help',
    icon: 'tabler:help-circle',
    to: '/help',
    active: route.path === '/help'
  }
]])
</script>

<template>
  <UDashboardGroup>
    <UDashboardSidebar
      v-model:collapsed="sidebarCollapsed"
      collapsible
      resizable
      class="border-r border-gray-200 dark:border-gray-800"
    >
      <template #header="{ collapsed }">
        <div class="flex items-center justify-center py-1">
          <UIcon 
            v-if="collapsed" 
            name="tabler:math-symbols" 
            class="size-6 text-primary" 
          />
          <div v-else class="flex items-center gap-2.5">
            <UIcon name="tabler:math-symbols" class="size-6 text-primary" />
            <span class="font-semibold text-base tracking-tight">NextLean</span>
          </div>
        </div>
      </template>

      <template #default="{ collapsed }">
        <UNavigationMenu
          :collapsed="collapsed"
          :items="navigationItems"
          orientation="vertical"
        />
      </template>

      <template #footer="{ collapsed }">
        <UNavigationMenu
          :collapsed="collapsed"
          :items="footerItems"
          orientation="vertical"
          class="mt-auto"
        />
      </template>
    </UDashboardSidebar>

    <UDashboardPanel grow>
      <template #header>
        <UDashboardNavbar :title="pageTitle">
          <template #left>
            <UDashboardSidebarCollapse side="left" />
          </template>
        </UDashboardNavbar>
      </template>

      <template #body>
        <div class="h-full flex flex-col min-h-0">
          <slot />
        </div>
      </template>
    </UDashboardPanel>
  </UDashboardGroup>
</template>

<style scoped>
/* Ensure proper sidebar collapse widths for left sidebar */
:deep(.group[data-collapsed="true"]) {
  min-width: 60px !important;
  max-width: 60px !important;
}

/* Main panel should be flexible */
:deep(.dashboard-panel) {
  flex: 1;
  min-width: 0;
  width: auto !important;
}

/* Smooth transitions for all panels */
:deep(.group) {
  transition: width 0.3s ease-in-out, min-width 0.3s ease-in-out, max-width 0.3s ease-in-out;
}
</style>