export interface Settings {
  // Editor
  editorFontSize: number;
  editorTheme: "vs-dark" | "vs-light";
  editorWordWrap: boolean;
  editorMinimap: boolean;
  editorLineNumbers: boolean;
}

export const useSettings = () => {
  const settings = useCookie<Settings>("nextlean-settings", {
    default: () => ({
      editorFontSize: 14,
      editorTheme: "vs-dark",
      editorWordWrap: true,
      editorMinimap: true,
      editorLineNumbers: true,
    }),
    watch: true,
  });

  // Sync with Nuxt Color Mode
  const colorMode = useColorMode();

  // Watch for external theme changes (e.g. from settings page) to update color mode
  watch(
    () => settings.value.editorTheme,
    (newTheme) => {
      colorMode.preference = newTheme === "vs-dark" ? "dark" : "light";
    },
    { immediate: true }
  );

  const updateSettings = (newSettings: Partial<Settings>) => {
    settings.value = {
      ...settings.value,
      ...newSettings,
    };
  };

  const resetSettings = () => {
    settings.value = {
      editorFontSize: 14,
      editorTheme: "vs-dark",
      editorWordWrap: true,
      editorMinimap: true,
      editorLineNumbers: true,
    };
  };

  return {
    settings,
    updateSettings,
    resetSettings,
  };
};
