// Fallback simple Monaco editor without lean4monaco to prevent hanging
export const useMonacoEditor = () => {
  const editorInstance = ref<any>(null);
  const isLoading = ref(true);
  const leanVersion = ref<string>("Lean 4 (Simple Mode)");
  const error = ref<string | null>(null);
  const infoviewInstance = ref<HTMLElement | null>(null);

  const initializeEditor = async (
    editorContainer: HTMLElement,
    infoviewContainer?: HTMLElement,
    filePath: string = "/project/main.lean",
    initialContent: string = "-- Lean 4 code here\n"
  ) => {
    // Only run on client side
    if (!import.meta.client) {
      console.warn("Editor can only be initialized on client side");
      return;
    }

    try {
      isLoading.value = true;
      error.value = null;

      // Import Monaco Editor directly (not lean4monaco)
      const monaco = await import("monaco-editor");

      // Simple Lean syntax highlighting
      if (!monaco.languages.getLanguages().some((lang) => lang.id === "lean")) {
        monaco.languages.register({ id: "lean" });

        monaco.languages.setMonarchTokensProvider("lean", {
          tokenizer: {
            root: [
              [/--.*$/, "comment"],
              [
                /\b(theorem|lemma|def|example|by|trivial|rfl|simp)\b/,
                "keyword",
              ],
              [/\b(Type|Prop|Nat|Bool|String|List)\b/, "type"],
              [/\b(true|false)\b/, "constant"],
              [/\b\d+\b/, "number"],
              [/".*?"/, "string"],
            ],
          },
        });
      }

      // Create simple Monaco editor
      editorInstance.value = monaco.editor.create(editorContainer, {
        value: initialContent,
        language: "lean",
        theme: "vs-dark",
        fontSize: 14,
        wordWrap: "on",
        minimap: { enabled: true },
        lineNumbers: "on",
        automaticLayout: true,
        scrollBeyondLastLine: false,
      });

      // Initialize infoview if container provided
      if (infoviewContainer) {
        infoviewInstance.value = infoviewContainer;
        infoviewContainer.innerHTML = `
          <div class="h-full flex flex-col">
            <div class="border-b border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-800">
              <h3 class="text-sm font-medium text-gray-900 dark:text-gray-100">Lean Infoview</h3>
            </div>
            <div class="flex-1 p-4 text-sm text-gray-600 dark:text-gray-400">
              <p>Lean infoview will display here when available.</p>
              <p class="mt-2">Currently in simple mode - connect with Lean server for full functionality.</p>
            </div>
          </div>
        `;
      }

      leanVersion.value = "Lean 4 (Simple Mode)";
      isLoading.value = false;

      return { editor: editorInstance.value, infoview: infoviewInstance.value };
    } catch (err) {
      console.error("Failed to initialize Monaco Editor:", err);
      error.value = err instanceof Error ? err.message : "Unknown error";
      leanVersion.value = "Lean 4 (error)";
      isLoading.value = false;
      throw err;
    }
  };

  const dispose = () => {
    try {
      if (editorInstance.value) {
        editorInstance.value.dispose();
        editorInstance.value = null;
      }
      if (infoviewInstance.value) {
        infoviewInstance.value.innerHTML = "";
        infoviewInstance.value = null;
      }
    } catch (err) {
      console.warn("Error during disposal:", err);
    }
  };

  return {
    editorInstance: readonly(editorInstance),
    infoviewInstance: readonly(infoviewInstance),
    isLoading: readonly(isLoading),
    leanVersion: readonly(leanVersion),
    error: readonly(error),
    initializeEditor,
    dispose,
  };
};
