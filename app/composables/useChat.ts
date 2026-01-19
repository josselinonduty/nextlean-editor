import type { ChatStatus } from "@nuxt/ui";
import type { ToolCallResult } from "#shared/types/tools";

export interface ChatMessagePart {
  id: string;
  type: "text";
  text: string;
}

export interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  parts: ChatMessagePart[];
  createdAt: number;
  toolCalls?: ToolCallResult[];
}

export interface UseChatReturn {
  status: Ref<ChatStatus>;
  messages: Ref<AssistantMessage[]>;
  createId: () => string;
  createPart: (text: string) => ChatMessagePart;
  clearMessages: () => void;
}

export const useChat = (): UseChatReturn => {
  const status = useState<ChatStatus>("chat-status", () => "ready");

  const createId = (): string => {
    if (
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
    ) {
      return crypto.randomUUID();
    }
    return Math.random().toString(36).slice(2);
  };

  const createPart = (text: string): ChatMessagePart => ({
    id: createId(),
    type: "text",
    text,
  });

  const initialMessage =
    "Hello! I am ready to help with Lean proofs, tactics, and strategy. Ask me anything about your development session.";

  const messages = useState<AssistantMessage[]>("chat-messages", () => [
    {
      id: createId(),
      role: "assistant",
      parts: [createPart(initialMessage)],
      createdAt: Date.now(),
    },
  ]);

  const clearMessages = (): void => {
    messages.value = [
      {
        id: createId(),
        role: "assistant",
        parts: [createPart(initialMessage)],
        createdAt: Date.now(),
      },
    ];
    status.value = "ready";
  };

  return {
    status,
    messages,
    createId,
    createPart,
    clearMessages,
  };
};
