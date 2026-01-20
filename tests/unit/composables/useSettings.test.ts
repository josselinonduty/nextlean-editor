import { describe, it, expect, vi, beforeEach } from "vitest";

describe("useSettings", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  const loadUseSettings = async () => {
    const mod = await import("~/composables/useSettings");
    return mod.useSettings;
  };

  describe("initial state", () => {
    it("should initialize with default settings", async () => {
      const useSettings = await loadUseSettings();
      const { settings } = useSettings();

      expect(settings.value).toEqual({
        editorFontSize: 14,
        editorTheme: "vs-dark",
        editorWordWrap: true,
        editorMinimap: true,
        editorLineNumbers: true,
      });
    });
  });

  describe("updateSettings", () => {
    it("should update a single setting", async () => {
      const useSettings = await loadUseSettings();
      const { settings, updateSettings } = useSettings();

      updateSettings({ editorFontSize: 18 });

      expect(settings.value.editorFontSize).toBe(18);
      expect(settings.value.editorTheme).toBe("vs-dark");
    });

    it("should update multiple settings at once", async () => {
      const useSettings = await loadUseSettings();
      const { settings, updateSettings } = useSettings();

      updateSettings({
        editorFontSize: 16,
        editorTheme: "vs-light",
        editorMinimap: false,
      });

      expect(settings.value.editorFontSize).toBe(16);
      expect(settings.value.editorTheme).toBe("vs-light");
      expect(settings.value.editorMinimap).toBe(false);
      expect(settings.value.editorWordWrap).toBe(true);
    });

    it("should preserve unmodified settings", async () => {
      const useSettings = await loadUseSettings();
      const { settings, updateSettings } = useSettings();

      const originalWordWrap = settings.value.editorWordWrap;
      const originalLineNumbers = settings.value.editorLineNumbers;

      updateSettings({ editorFontSize: 20 });

      expect(settings.value.editorWordWrap).toBe(originalWordWrap);
      expect(settings.value.editorLineNumbers).toBe(originalLineNumbers);
    });
  });

  describe("resetSettings", () => {
    it("should reset all settings to defaults", async () => {
      const useSettings = await loadUseSettings();
      const { settings, updateSettings, resetSettings } = useSettings();

      updateSettings({
        editorFontSize: 20,
        editorTheme: "vs-light",
        editorWordWrap: false,
        editorMinimap: false,
        editorLineNumbers: false,
      });

      resetSettings();

      expect(settings.value).toEqual({
        editorFontSize: 14,
        editorTheme: "vs-dark",
        editorWordWrap: true,
        editorMinimap: true,
        editorLineNumbers: true,
      });
    });
  });

  describe("settings persistence", () => {
    it("should persist changes within same composable instance", async () => {
      const useSettings = await loadUseSettings();
      const { settings, updateSettings } = useSettings();

      updateSettings({ editorFontSize: 22 });

      expect(settings.value.editorFontSize).toBe(22);
    });
  });

  describe("theme values", () => {
    it("should accept vs-dark theme", async () => {
      const useSettings = await loadUseSettings();
      const { settings, updateSettings } = useSettings();

      updateSettings({ editorTheme: "vs-dark" });

      expect(settings.value.editorTheme).toBe("vs-dark");
    });

    it("should accept vs-light theme", async () => {
      const useSettings = await loadUseSettings();
      const { settings, updateSettings } = useSettings();

      updateSettings({ editorTheme: "vs-light" });

      expect(settings.value.editorTheme).toBe("vs-light");
    });
  });

  describe("font size bounds", () => {
    it("should accept various font sizes", async () => {
      const useSettings = await loadUseSettings();
      const { settings, updateSettings } = useSettings();

      updateSettings({ editorFontSize: 10 });
      expect(settings.value.editorFontSize).toBe(10);

      updateSettings({ editorFontSize: 32 });
      expect(settings.value.editorFontSize).toBe(32);
    });
  });

  describe("boolean settings", () => {
    it("should toggle word wrap", async () => {
      const useSettings = await loadUseSettings();
      const { settings, updateSettings } = useSettings();

      updateSettings({ editorWordWrap: false });
      expect(settings.value.editorWordWrap).toBe(false);

      updateSettings({ editorWordWrap: true });
      expect(settings.value.editorWordWrap).toBe(true);
    });

    it("should toggle minimap", async () => {
      const useSettings = await loadUseSettings();
      const { settings, updateSettings } = useSettings();

      updateSettings({ editorMinimap: false });
      expect(settings.value.editorMinimap).toBe(false);

      updateSettings({ editorMinimap: true });
      expect(settings.value.editorMinimap).toBe(true);
    });

    it("should toggle line numbers", async () => {
      const useSettings = await loadUseSettings();
      const { settings, updateSettings } = useSettings();

      updateSettings({ editorLineNumbers: false });
      expect(settings.value.editorLineNumbers).toBe(false);

      updateSettings({ editorLineNumbers: true });
      expect(settings.value.editorLineNumbers).toBe(true);
    });
  });
});
