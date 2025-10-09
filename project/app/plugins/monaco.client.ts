export default defineNuxtPlugin(() => {
  // Monaco Editor plugin for client-side initialization
  if (import.meta.client) {
    // Monaco Editor will be loaded dynamically in components
    // This plugin ensures proper SSR handling
  }
});
