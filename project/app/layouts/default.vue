
<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

// Reactive state for sidebar
const sidebarCollapsed = ref(false)

// Page title from route meta or default
const route = useRoute()
const pageTitle = computed(() => {
  // Try to get title from various sources
  return (route.meta?.title as string) || 'NextLean'
})

// Navigation items for the main menu
const navigationItems: NavigationMenuItem[][] = [[
  {
    label: 'Editor',
    icon: 'tabler:code',
    to: '/editor'
  },
  {
    label: 'Chat',
    icon: 'tabler:message-circle',
    to: '/chat'
  },
  {
    label: 'Proofs',
    icon: 'tabler:file-text',
    to: '/proofs'
  }
]]

// Footer navigation items
const footerItems: NavigationMenuItem[][] = [[
  {
    label: 'Settings',
    icon: 'tabler:settings',
    to: '/settings'
  },
  {
    label: 'Help',
    icon: 'tabler:help-circle',
    to: '/help'
  }
]]
</script>

<template>
  <UDashboardGroup>
    <!-- Sidebar -->
    <UDashboardSidebar
      v-model:collapsed="sidebarCollapsed"
      collapsible
      resizable
    >
      <template #header="{ collapsed }">
        <UIcon 
          v-if="collapsed" 
          name="tabler:math-symbols" 
          class="size-5 text-primary mx-auto" 
        />
        <div v-else class="flex items-center gap-2">
          <UIcon name="tabler:math-symbols" class="size-5 text-primary" />
          <span class="font-semibold text-sm">NextLean</span>
        </div>
      </template>

      <template #default="{ collapsed }">
        <!-- Navigation Menu -->
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

    <!-- Main Content Panel -->
    <UDashboardPanel grow>
      <!-- Top Bar -->
      <template #header>
        <UDashboardNavbar :title="pageTitle">
          <template #left>
            <UDashboardSidebarCollapse side="left" />
          </template>
        </UDashboardNavbar>
      </template>

      <!-- Page Content -->
      <template #body>
        <div class="h-full flex flex-col overflow-hidden min-h-0">
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