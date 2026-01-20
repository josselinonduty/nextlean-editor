<script setup lang="ts">
import { marked } from "marked";
import type { ToolCallResult, EditEditorInput, EditPreview } from "#shared/types/tools";
import type { AssistantMessage } from "~/composables/useChat";

interface PayloadMessage {
  role: "user" | "assistant";
  content: string;
}

interface StreamEvent {
  type: "token" | "tool_start" | "tool_end" | "done" | "error";
  content?: string;
  name?: string;
  input?: unknown;
  output?: string;
  message?: string;
  steps?: ToolCallResult[];
}

const toast = useToast();
const { status, messages, createId, createPart, clearMessages } = useChat();
const { code, executeEditorEdit, getEditorEditPreview } = useEditorState();
const { diagnostics } = useLeanLsp();
const draft = ref("");
const promptError = ref<Error | null>(null);
const promptErrorMessage = ref<string | null>(null);
const lastPayload = ref<PayloadMessage[] | null>(null);

const pendingEdit = ref<EditEditorInput | null>(null);
const editPreview = ref<EditPreview | null>(null);
const showEditConfirmModal = ref(false);

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const chatMessages = computed(() => messages.value);

const isBusy = computed(() => status.value === "submitted" || status.value === "streaming");

const clearErrorState = () => {
  promptError.value = null;
  promptErrorMessage.value = null;
  if (status.value === "error") {
    status.value = "ready";
  }
};

watch(draft, () => {
  if (promptError.value) {
    clearErrorState();
  }
});

const extractText = (message: AssistantMessage): string =>
  message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n\n");

const buildPayload = (): PayloadMessage[] =>
  messages.value.map((message) => ({
    role: message.role,
    content: extractText(message),
  }));

const applyEdit = async (edit: EditEditorInput): Promise<void> => {
  if (!edit || typeof edit.startLine !== 'number' || typeof edit.endLine !== 'number') {
    console.error("Invalid edit input:", edit);
    toast.add({ title: "Edit failed", description: "Invalid edit parameters.", color: "error" });
    return;
  }

  const preview = getEditorEditPreview(edit);
  if (!preview) {
    console.warn("Could not get edit preview - editor may not be registered");
    toast.add({ 
      title: "Edit available", 
      description: `The assistant suggested editing lines ${edit.startLine}-${edit.endLine}. Open the editor page to apply edits.`, 
      color: "warning" 
    });
    return;
  }

  pendingEdit.value = edit;
  editPreview.value = preview;
  showEditConfirmModal.value = true;
};

const confirmEdit = async (): Promise<void> => {
  if (!pendingEdit.value) return;

  const success = await executeEditorEdit(pendingEdit.value);
  if (success) {
    toast.add({ 
      title: "Editor updated", 
      description: `Lines ${pendingEdit.value.startLine}-${pendingEdit.value.endLine} modified. Use Ctrl+Z to undo.`, 
      color: "success" 
    });
  } else {
    toast.add({ title: "Edit failed", description: "Could not apply the edit.", color: "error" });
  }

  pendingEdit.value = null;
  editPreview.value = null;
  showEditConfirmModal.value = false;
};

const cancelEdit = (): void => {
  pendingEdit.value = null;
  editPreview.value = null;
  showEditConfirmModal.value = false;
  toast.add({ title: "Edit cancelled", color: "info" });
};

const sendPayloadStream = async (payload: PayloadMessage[]): Promise<void> => {
  lastPayload.value = payload;
  status.value = "streaming";

  const currentDiagnostics = diagnostics.value.length > 0 
    ? diagnostics.value[diagnostics.value.length - 1]?.diagnostics 
    : [];

  const messageId = createId();
  let currentContent = "";
  const toolCalls: ToolCallResult[] = [];

  messages.value.push({
    id: messageId,
    role: "assistant",
    parts: [createPart("")],
    createdAt: Date.now(),
    toolCalls: [],
  });

  const currentMessageIndex = messages.value.length - 1;

  try {
    const response = await fetch("/api/chat/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: payload,
        editorContent: code.value,
        diagnostics: currentDiagnostics,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.statusMessage || errorData.message || `Request failed: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const jsonStr = line.slice(6);
        if (!jsonStr.trim()) continue;

        try {
          const event: StreamEvent = JSON.parse(jsonStr);
          const currentMessage = messages.value[currentMessageIndex];
          if (!currentMessage) continue;

          switch (event.type) {
            case "token":
              if (event.content) {
                currentContent += event.content;
                currentMessage.parts = [createPart(currentContent)];
              }
              break;

            case "tool_start":
              if (event.name) {
                toolCalls.push({
                  name: event.name as ToolCallResult["name"],
                  input: event.input,
                  output: "",
                });
                currentMessage.toolCalls = [...toolCalls];
              }
              break;

            case "tool_end":
              if (event.name) {
                const toolIndex = toolCalls.findIndex((t) => t.name === event.name && !t.output);
                if (toolIndex >= 0 && toolCalls[toolIndex]) {
                  toolCalls[toolIndex].output = event.output || "";
                  if (event.input) {
                    toolCalls[toolIndex].input = event.input;
                  }
                  currentMessage.toolCalls = [...toolCalls];

                  if (event.name === "edit_editor" && event.input) {
                    await applyEdit(event.input as EditEditorInput);
                  }
                }
              }
              break;

            case "done":
              if (event.steps) {
                for (const step of event.steps) {
                  if (step.name === "edit_editor" && step.input) {
                    const existingTool = toolCalls.find(
                      (t) => t.name === "edit_editor" && JSON.stringify(t.input) === JSON.stringify(step.input)
                    );
                    if (!existingTool) {
                      await applyEdit(step.input as EditEditorInput);
                    }
                  }
                }
              }
              status.value = "ready";
              break;

            case "error":
              throw new Error(event.message || "Stream error");
          }
        } catch (parseError) {
          console.error("Failed to parse SSE event:", parseError);
        }
      }
    }

    const finalMessage = messages.value[currentMessageIndex];
    if (finalMessage && !currentContent.trim()) {
      currentContent = "I was unable to generate a response. Please try again.";
      finalMessage.parts = [createPart(currentContent)];
    }

    status.value = "ready";
    promptError.value = null;
    promptErrorMessage.value = null;
    lastPayload.value = null;
  } catch (error) {
    status.value = "error";
    const message = error instanceof Error ? error.message : "The chat request failed.";
    promptError.value = new Error(message);
    promptErrorMessage.value = message;

    if (messages.value[currentMessageIndex]) {
      messages.value.splice(currentMessageIndex, 1);
    }

    toast.add({
      title: "Chat request failed",
      description: message,
      color: "error",
    });
  }
};

const sendPayload = async (payload: PayloadMessage[]): Promise<void> => {
  return sendPayloadStream(payload);
};

const handleSubmit = () => {
  if (isBusy.value) {
    return;
  }

  const trimmed = draft.value.trim();
  if (!trimmed) {
    promptError.value = new Error("Enter a message before sending.");
    promptErrorMessage.value = "Enter a message before sending.";
    return;
  }

  messages.value.push({
    id: createId(),
    role: "user",
    parts: [createPart(trimmed)],
    createdAt: Date.now(),
  });

  draft.value = "";
  clearErrorState();
  sendPayload(buildPayload());
};

const handleReload = () => {
  if (!lastPayload.value || isBusy.value) {
    return;
  }
  clearErrorState();
  sendPayload(lastPayload.value);
};

const handleStop = () => {
  if (status.value === "submitted" || status.value === "streaming") {
    status.value = "ready";
  }
};

const copyToClipboard = (text: string) => {
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    navigator.clipboard.writeText(text);
    toast.add({
      title: "Copied to clipboard",
      color: "success",
    });
  }
};

const renderMarkdown = (text: string) => {
  return marked.parse(text);
};
</script>

<template>
  <div class="flex h-full flex-col">
    <UCard class="flex h-full flex-col overflow-hidden" :ui="{ root: 'h-full flex flex-col', body: 'flex-1 min-h-0 flex flex-col p-0 sm:p-0', header: 'flex-none p-3 sm:p-3', footer: 'flex-none' }">
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
            Assistant
          </h3>
          <UButton
            icon="tabler:trash"
            size="xs"
            color="neutral"
            variant="ghost"
            label="Clear Chat"
            @click="clearMessages"
          />
        </div>
      </template>
      <div class="flex-1 min-h-0 overflow-y-auto px-4 py-4">
        <UChatMessages
          :messages="chatMessages"
          :status="status"
          should-auto-scroll
          :user="{ avatar: { icon: 'tabler:user' }, variant: 'soft' }"
          :assistant="{ 
            avatar: { icon: 'tabler:robot' }, 
            variant: 'subtle',
            actions: [
              {
                label: 'Copy',
                icon: 'tabler:copy',
                onClick: (_e: MouseEvent, message: unknown) => copyToClipboard(extractText(message as AssistantMessage))
              }
            ]
          }"
        >
          <template #content="{ message }">
            <div v-if="(message as AssistantMessage).toolCalls?.length" class="mb-3 flex flex-col gap-2">
              <div v-for="(tool, index) in (message as AssistantMessage).toolCalls" :key="index" class="text-xs bg-gray-50 dark:bg-gray-800/50 rounded-md p-2 border border-gray-200 dark:border-gray-800">
                <div class="flex items-center gap-1.5 font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <UIcon name="tabler:tool" class="w-3.5 h-3.5 text-primary-500" />
                  <span>Used tool: <span class="font-mono">{{ tool.name }}</span></span>
                  <UIcon v-if="!tool.output" name="tabler:loader" class="w-3.5 h-3.5 animate-spin" />
                </div>
                <div class="font-mono text-gray-500 dark:text-gray-400 truncate pl-5">
                  Input: {{ JSON.stringify(tool.input) }}
                </div>
              </div>
            </div>
            <div 
              v-if="message.role === 'assistant'"
              class="markdown-body text-sm leading-6 text-gray-900 dark:text-gray-100 font-sans"
              v-html="renderMarkdown(extractText(message as AssistantMessage))"
            ></div>
            <div 
              v-else
              class="whitespace-pre-wrap text-sm leading-6 text-gray-900 dark:text-gray-100 font-sans"
            >
              {{ extractText(message as AssistantMessage) }}
            </div>
          </template>
        </UChatMessages>
      </div>

      <div class="flex-none border-t border-gray-200 p-4 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
        <UChatPrompt
          v-model="draft"
          :disabled="isBusy"
          :loading="isBusy"
          :error="promptError ?? undefined"
          placeholder="Ask about Lean tactics, proofs, or code generation..."
          variant="outline"
          class="w-full"
          :ui="{ root: 'w-full' }"
          @submit.prevent="handleSubmit"
        >
          <template #footer>
            <div class="flex w-full items-center justify-between gap-2 mt-2">
              <span v-if="promptErrorMessage" class="text-xs text-red-500">
                {{ promptErrorMessage }}
              </span>
              <div class="ml-auto flex items-center gap-2">
                <span v-if="isBusy" class="text-xs text-gray-500 animate-pulse">Streaming...</span>
                <UChatPromptSubmit
                  :status="status"
                  icon="tabler:send"
                  color="primary"
                  variant="solid"
                  @stop="handleStop"
                  @reload="handleReload"
                />
              </div>
            </div>
          </template>
        </UChatPrompt>
      </div>
    </UCard>

    <UModal v-model:open="showEditConfirmModal" :ui="{ content: 'max-w-2xl' }">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="tabler:edit" class="w-5 h-5 text-primary-500" />
              <h3 class="text-lg font-semibold">Confirm Editor Changes</h3>
            </div>
          </template>
          <div v-if="editPreview" class="space-y-4">
            <p class="text-sm text-gray-600 dark:text-gray-400">
              The assistant wants to modify lines {{ editPreview.startLine }}-{{ editPreview.endLine }}:
            </p>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <h4 class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase">Current Content</h4>
                <pre class="text-xs bg-red-50 dark:bg-red-900/20 p-3 rounded-md overflow-auto max-h-64 border border-red-200 dark:border-red-800"><code>{{ editPreview.oldContent || '(empty)' }}</code></pre>
              </div>
              <div>
                <h4 class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase">New Content</h4>
                <pre class="text-xs bg-green-50 dark:bg-green-900/20 p-3 rounded-md overflow-auto max-h-64 border border-green-200 dark:border-green-800"><code>{{ editPreview.newContent || '(empty)' }}</code></pre>
              </div>
            </div>
            <p class="text-xs text-gray-500">
              You can undo this change with Ctrl+Z after applying.
            </p>
          </div>
          <template #footer>
            <div class="flex justify-end gap-3">
              <UButton color="neutral" variant="ghost" @click="cancelEdit">
                Cancel
              </UButton>
              <UButton color="primary" @click="confirmEdit">
                Apply Changes
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>

<style scoped>
:deep(.markdown-body p) {
  margin-bottom: 0.75em;
}
:deep(.markdown-body p:last-child) {
  margin-bottom: 0;
}
:deep(.markdown-body pre) {
  background-color: #f3f4f6;
  padding: 0.75rem;
  border-radius: 0.375rem;
  overflow-x: auto;
  margin-bottom: 0.75em;
}
:deep(.dark .markdown-body pre) {
  background-color: #1f2937;
}
:deep(.markdown-body code) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 0.875em;
  background-color: #f3f4f6;
  padding: 0.2em 0.4em;
  border-radius: 0.25rem;
}
:deep(.dark .markdown-body code) {
  background-color: #1f2937;
}
:deep(.markdown-body pre code) {
  background-color: transparent;
  padding: 0;
  font-size: 1em;
  color: inherit;
}
:deep(.markdown-body ul), :deep(.markdown-body ol) {
  margin-bottom: 0.75em;
  padding-left: 1.5em;
}
:deep(.markdown-body ul) {
  list-style-type: disc;
}
:deep(.markdown-body ol) {
  list-style-type: decimal;
}
:deep(.markdown-body a) {
  color: #3b82f6;
  text-decoration: underline;
}
:deep(.markdown-body h1), :deep(.markdown-body h2), :deep(.markdown-body h3), :deep(.markdown-body h4) {
  font-weight: 600;
  margin-top: 1em;
  margin-bottom: 0.5em;
  line-height: 1.25;
}
:deep(.markdown-body h1) { font-size: 1.5em; }
:deep(.markdown-body h2) { font-size: 1.25em; }
:deep(.markdown-body h3) { font-size: 1.1em; }
</style>
