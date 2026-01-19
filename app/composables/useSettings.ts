export interface Settings {
  editorFontSize: number;
  editorTheme: "vs-dark" | "vs-light";
  editorWordWrap: boolean;
  editorMinimap: boolean;
  editorLineNumbers: boolean;
}

export interface UseSettingsReturn {
  settings: Ref<Settings>;
  updateSettings: (newSettings: Partial<Settings>) => void;
  resetSettings: () => void;
}

export const useSettings = (): UseSettingsReturn => {
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
    { immediate: true },
  );

  const updateSettings = (newSettings: Partial<Settings>): void => {
    settings.value = {
      ...settings.value,
      ...newSettings,
    };
  };

  const resetSettings = (): void => {
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
