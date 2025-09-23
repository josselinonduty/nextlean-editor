
<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

// Reactive state for sidebar
const sidebarCollapsed = ref(false)

// Page title from route meta or default
const route = useRoute()
const pageTitle = computed(() => {
  // Try to get title from various sources
  return route.meta?.title || 'NextLean'
})

// Navigation items for the main menu
const navigationItems: NavigationMenuItem[][] = [[
  {
    label: 'Home',
    icon: 'tabler:home',
    to: '/',
    active: route.path === '/'
  },
  {
    label: 'Lean Editor',
    icon: 'tabler:code',
    to: '/editor'
  },
  {
    label: 'Proofs',
    icon: 'tabler:file-text',
    to: '/proofs'
  },
  {
    label: 'Tutorials',
    icon: 'tabler:book',
    to: '/tutorials'
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

// Keyboard shortcut to toggle sidebar (Meta + K)
onMounted(() => {
  const handleKeydown = (event: KeyboardEvent) => {
    if (event.metaKey && event.key === 'k') {
      event.preventDefault()
      sidebarCollapsed.value = !sidebarCollapsed.value
    }
  }
  
  document.addEventListener('keydown', handleKeydown)
  
  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown)
  })
})
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
          name="tabler:home" 
          class="size-5 text-primary mx-auto" 
        />
        <div v-else class="flex items-center gap-2">
          <UIcon name="tabler:home" class="size-5 text-primary" />
          <span class="font-semibold text-sm">NextLean</span>
        </div>
      </template>

      <template #default="{ collapsed }">
        <!-- Search Button -->
        <UButton
          :label="collapsed ? undefined : 'Search...'"
          icon="tabler:search"
          color="neutral"
          variant="outline"
          block
          :square="collapsed"
        >
          <template v-if="!collapsed" #trailing>
            <div class="flex items-center gap-0.5 ms-auto">
              <UKbd value="meta" variant="subtle" />
              <UKbd value="K" variant="subtle" />
            </div>
          </template>
        </UButton>

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
    <UDashboardPanel>
      <!-- Top Bar -->
      <template #header>
        <UDashboardNavbar :title="pageTitle">
          <template #left>
            <UDashboardSidebarToggle />
          </template>
        </UDashboardNavbar>
      </template>

      <!-- Page Content -->
      <template #body>
        <slot />
      </template>
    </UDashboardPanel>
  </UDashboardGroup>
</template>