import type { LeanRPCRequest, LeanRPCResponse } from "../../shared/types";

export const useLeanEditor = () => {
  const editorInstance = ref<any>(null);
  const isLoading = ref(true);
  const leanVersion = ref<string>("Lean 4");
  const error = ref<string | null>(null);
  const useWebSocket = ref(false);

  const { connect, disconnect, sendRPCRequest, isConnected, sessionId, error: wsError } = useLeanWebSocket();

  const initializeEditor = async (
    editorContainer: HTMLElement,
    infoviewContainer?: HTMLElement,
    filePath: string = "/project/main.lean",
    initialContent: string = "-- Lean 4 code here\n",
    enableWebSocket: boolean = false
  ) => {
    if (!import.meta.client) {
      console.warn("Editor can only be initialized on client side");
      return;
    }

    try {
      isLoading.value = true;
      error.value = null;
      useWebSocket.value = enableWebSocket;

      const monaco = await import("monaco-editor");

      if (!monaco.languages.getLanguages().some((lang) => lang.id === "lean")) {
        monaco.languages.register({ id: "lean" });

        monaco.languages.setMonarchTokensProvider("lean", {
          tokenizer: {
            root: [
              [/--.*$/, "comment"],
              [
                /\b(theorem|lemma|def|example|by|trivial|rfl|simp|inductive|structure)\b/,
                "keyword",
              ],
              [/\b(Type|Prop|Nat|Bool|String|List|Int)\b/, "type"],
              [/\b(true|false)\b/, "constant"],
              [/\b\d+\b/, "number"],
              [/".*?"/, "string"],
            ],
          },
        });
      }

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

      if (enableWebSocket) {
        connect();

        watch(isConnected, (connected) => {
          if (connected) {
            console.log("WebSocket connected, initializing Lean language server...");
            initializeLeanLanguageServer(filePath, initialContent);
          }
        });
      }

      if (infoviewContainer) {
        infoviewContainer.innerHTML = `
          <div class="h-full flex flex-col">
            <div class="border-b border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-800">
              <h3 class="text-sm font-medium text-gray-900 dark:text-gray-100">Lean Infoview</h3>
            </div>
            <div class="flex-1 p-4 text-sm text-gray-600 dark:text-gray-400">
              <p>${enableWebSocket ? "Connecting to Lean server..." : "WebSocket mode disabled"}</p>
            </div>
          </div>
        `;
      }

      leanVersion.value = enableWebSocket ? "Lean 4 (WebSocket Mode)" : "Lean 4 (Simple Mode)";
      isLoading.value = false;

      return { editor: editorInstance.value };
    } catch (err) {
      console.error("Error initializing editor:", err);
      error.value = err instanceof Error ? err.message : "Unknown error";
      isLoading.value = false;
      return null;
    }
  };

  const initializeLeanLanguageServer = async (filePath: string, content: string) => {
    if (!isConnected.value) {
      console.warn("Cannot initialize language server: WebSocket not connected");
      return;
    }

    try {
      const response = await sendRPCRequest("initialize", {
        processId: null,
        rootUri: "file:///project",
        capabilities: {
          textDocument: {
            synchronization: {
              dynamicRegistration: true,
              willSave: true,
              willSaveWaitUntil: true,
              didSave: true,
            },
            completion: {
              dynamicRegistration: true,
              completionItem: {
                snippetSupport: true,
              },
            },
            hover: {
              dynamicRegistration: true,
              contentFormat: ["plaintext", "markdown"],
            },
            definition: {
              dynamicRegistration: true,
            },
          },
        },
      });

      console.log("Lean language server initialized:", response);

      await sendRPCRequest("initialized", {});

      await sendRPCRequest("textDocument/didOpen", {
        textDocument: {
          uri: `file://${filePath}`,
          languageId: "lean",
          version: 1,
          text: content,
        },
      });

      console.log("Document opened in Lean server");
    } catch (err) {
      console.error("Error initializing language server:", err);
      error.value = err instanceof Error ? err.message : "Unknown error";
    }
  };

  const dispose = () => {
    if (editorInstance.value) {
      editorInstance.value.dispose();
      editorInstance.value = null;
    }

    if (useWebSocket.value && isConnected.value) {
      disconnect();
    }
  };

  onUnmounted(() => {
    dispose();
  });

  return {
    editorInstance: readonly(editorInstance),
    isLoading: readonly(isLoading),
    leanVersion: readonly(leanVersion),
    error: readonly(error),
    initializeEditor,
    dispose,
    isConnected: readonly(isConnected),
    sessionId: readonly(sessionId),
    wsError: readonly(wsError),
  };
};
