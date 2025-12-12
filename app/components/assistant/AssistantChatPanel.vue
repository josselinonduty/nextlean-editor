<script setup lang="ts">
import { marked } from "marked";

interface PayloadMessage {
  role: "user" | "assistant";
  content: string;
}

const toast = useToast();
const { status, messages, createId, createPart, clearMessages } = useChat();
const { code, updateCode } = useEditorState();
const { diagnostics } = useLeanLsp();
const draft = ref("");
const promptError = ref<Error | null>(null);
const promptErrorMessage = ref<string | null>(null);
const lastPayload = ref<PayloadMessage[] | null>(null);

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

const extractText = (message: AssistantMessage) =>
  message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n\n");

const buildPayload = (): PayloadMessage[] =>
  messages.value.map((message) => ({
    role: message.role,
    content: extractText(message),
  }));

const sendPayload = async (payload: PayloadMessage[]) => {
  lastPayload.value = payload;
  status.value = "submitted";
  
  // Get latest diagnostics
  const currentDiagnostics = diagnostics.value.length > 0 ? diagnostics.value[diagnostics.value.length - 1]?.diagnostics : [];

  try {
    const response = await $fetch<{
      message: string;
      steps?: ChatToolCall[];
    }>("/api/chat", {
      method: "POST",
      body: {
        messages: payload,
        editorContent: code.value,
        diagnostics: currentDiagnostics,
      },
    });

    if (response.steps) {
      for (const step of response.steps) {
        if (step.name === "edit_editor") {
          try {
            const args = step.input as { startLine: number; endLine: number; newContent: string };
            const lines = code.value.split("\n");
            // 1-based indexing
            const start = Math.max(0, args.startLine - 1);
            const end = Math.min(lines.length - 1, args.endLine - 1);
            
            if (start <= end) {
              // If newContent has multiple lines, we should split it too?
              // Or just insert it as a string?
              // splice takes items.
              // If newContent is "a\nb", we want to insert "a", "b".
              // But code.value is a string joined by \n.
              // So we can just replace the chunk.
              
              // Simpler approach:
              const before = lines.slice(0, start);
              const after = lines.slice(end + 1);
              const newLines = [
                ...before,
                args.newContent,
                ...after
              ];
              updateCode(newLines.join("\n"));
              toast.add({ title: "Editor updated", description: `Lines ${args.startLine}-${args.endLine} modified.`, color: "green" });
            }
          } catch (e) {
            console.error("Failed to apply edit:", e);
            toast.add({ title: "Edit failed", description: "Could not apply the assistant's edit.", color: "red" });
          }
        }
      }
    }

    messages.value.push({
      id: createId(),
      role: "assistant",
      parts: [createPart(response.message)],
      createdAt: Date.now(),
      toolCalls: response.steps,
    });

    status.value = "ready";
    promptError.value = null;
    promptErrorMessage.value = null;
    lastPayload.value = null;
  } catch (error) {
    status.value = "error";
    const fallback = "The chat request failed.";
    const message = (() => {
      if (error && typeof error === "object") {
        const data = (error as { data?: { statusMessage?: string; message?: string } }).data;
        if (data?.statusMessage) {
          return data.statusMessage;
        }
        if (data?.message) {
          return data.message;
        }
      }
      if (error instanceof Error && error.message) {
        return error.message;
      }
      return fallback;
    })();
    promptError.value = new Error(message);
    promptErrorMessage.value = message;
    toast.add({
      title: "Chat request failed",
      description: message,
      color: "error",
    });
  }
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
  <div class="flex h-full flex-col gap-4">
    <UCard class="flex min-h-0 flex-1 flex-col overflow-hidden" :ui="{ body: 'flex flex-col h-full p-0 sm:p-0', header: 'p-3 sm:p-3' }">
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
            Assistant
          </h3>
          <UButton
            icon="tabler:trash"
            size="xs"
            color="gray"
            variant="ghost"
            label="Clear Chat"
            @click="clearMessages"
          />
        </div>
      </template>
      <div class="flex-1 overflow-y-auto px-4 py-4">
        <UChatMessages
          :messages="chatMessages"
          :status="status"
          should-auto-scroll
          :user="{ avatar: { icon: 'tabler:user', color: 'primary' }, variant: 'soft', color: 'primary' }"
          :assistant="{ 
            avatar: { icon: 'tabler:robot', color: 'neutral' }, 
            variant: 'subtle',
            actions: [
              {
                label: 'Copy',
                icon: 'tabler:copy',
                click: (message: AssistantMessage) => copyToClipboard(extractText(message))
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

      <div class="border-t border-gray-200 p-4 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
        <UChatPrompt
          v-model="draft"
          :disabled="isBusy"
          :loading="isBusy"
          :error="promptError ?? undefined"
          placeholder="Ask about Lean tactics, proofs, or code generation..."
          variant="outline"
          class="w-full"
          :ui="{ wrapper: 'w-full' }"
          @submit.prevent="handleSubmit"
        >
          <template #footer>
            <div class="flex w-full items-center justify-between gap-2 mt-2">
              <span v-if="promptErrorMessage" class="text-xs text-red-500">
                {{ promptErrorMessage }}
              </span>
              <div class="ml-auto flex items-center gap-2">
                <span v-if="isBusy" class="text-xs text-gray-500 animate-pulse">Thinking...</span>
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
