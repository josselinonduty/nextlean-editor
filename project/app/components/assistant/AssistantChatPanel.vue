<script setup lang="ts">
import type { ChatStatus } from "@nuxt/ui";

interface ChatReference {
  id: string;
  title: string;
  snippet: string;
  tags: string[];
  updatedAt: number;
  relevance: number;
}

interface ChatMessagePart {
  id: string;
  type: "text";
  text: string;
}

interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  parts: ChatMessagePart[];
  createdAt: number;
  metadata?: {
    references?: ChatReference[];
  };
}

interface PayloadMessage {
  role: "user" | "assistant";
  content: string;
}

const toast = useToast();
const status = ref<ChatStatus>("ready");
const draft = ref("");
const promptError = ref<Error | null>(null);
const promptErrorMessage = ref<string | null>(null);
const lastPayload = ref<PayloadMessage[] | null>(null);

const createId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};

const createPart = (text: string): ChatMessagePart => ({
  id: createId(),
  type: "text",
  text,
});

const initialMessage = "Hello! I am ready to help with Lean proofs, tactics, and strategy. Ask me anything about your development session.";

const messages = ref<AssistantMessage[]>([
  {
    id: createId(),
    role: "assistant",
    parts: [createPart(initialMessage)],
    createdAt: Date.now(),
    metadata: { references: [] },
  },
]);

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const activeReferences = computed(() => {
  for (let index = messages.value.length - 1; index >= 0; index -= 1) {
    const message = messages.value[index];
    if (message.role === "assistant" && message.metadata?.references?.length) {
      return message.metadata.references;
    }
  }
  return [] as ChatReference[];
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
  try {
    const response = await $fetch<{
      message: string;
      relatedProofs: ChatReference[];
    }>("/api/chat", {
      method: "POST",
      body: {
        messages: payload,
      },
    });

    messages.value.push({
      id: createId(),
      role: "assistant",
      parts: [createPart(response.message)],
      createdAt: Date.now(),
      metadata: {
        references: response.relatedProofs ?? [],
      },
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

const openProof = (id: string) => {
  navigateTo({ path: "/editor", query: { proofId: id } });
};
</script>

<template>
  <div class="flex h-full flex-col gap-4">
    <UCard class="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div class="flex-1 overflow-y-auto px-2">
        <UChatMessages
          :messages="chatMessages"
          :status="status"
          should-auto-scroll
          class="h-full"
          :user="{ avatar: { icon: 'tabler:user', color: 'info' }, variant: 'soft' }"
          :assistant="{ avatar: { icon: 'tabler:robot', color: 'neutral' }, variant: 'subtle' }"
        >
          <template #content="{ message }">
            <div class="whitespace-pre-wrap text-sm leading-6 text-gray-900 dark:text-gray-100">
              {{ extractText(message as AssistantMessage) }}
            </div>
          </template>
        </UChatMessages>
      </div>

      <div class="border-t border-gray-200 p-3 dark:border-gray-800">
        <UChatPrompt
          v-model="draft"
          :disabled="isBusy"
          :error="promptError ?? undefined"
          placeholder="Describe what you need in Lean or ask a follow-up question..."
          variant="soft"
          @submit.prevent="handleSubmit"
        >
          <template #footer>
            <div class="flex w-full items-center justify-between gap-2">
              <span v-if="promptErrorMessage" class="text-xs text-red-500">
                {{ promptErrorMessage }}
              </span>
              <div class="ml-auto flex items-center gap-2">
                <UChatPromptSubmit
                  :status="status"
                  icon="tabler:arrow-up-right"
                  color="info"
                  @stop="handleStop"
                  @reload="handleReload"
                />
              </div>
            </div>
          </template>
        </UChatPrompt>
      </div>
    </UCard>

    <div class="space-y-3">
      <div v-if="activeReferences.length === 0" class="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
        Related proofs will appear here once the assistant references your saved work.
      </div>
      <div v-else class="space-y-3">
        <div
          v-for="reference in activeReferences"
          :key="reference.id"
          class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
        >
          <div class="flex items-center justify-between gap-3">
            <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {{ reference.title }}
            </p>
            <span class="text-xs text-gray-500 dark:text-gray-400">
              {{ dateFormatter.format(reference.updatedAt) }}
            </span>
          </div>
          <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
            {{ reference.snippet }}
          </p>
          <div class="mt-3 flex flex-wrap gap-2">
            <UBadge
              v-for="tag in reference.tags"
              :key="tag"
              color="info"
              variant="soft"
              size="xs"
            >
              {{ tag }}
            </UBadge>
            <UBadge color="neutral" variant="subtle" size="xs">
              {{ (reference.relevance * 100).toFixed(1) }}%
            </UBadge>
          </div>
          <div class="mt-3 flex justify-end">
            <UButton
              size="xs"
              variant="soft"
              color="info"
              icon="tabler:arrow-up-right"
              @click="openProof(reference.id)"
            >
              Open in editor
            </UButton>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
