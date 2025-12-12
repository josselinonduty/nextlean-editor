import type { ChatStatus } from "@nuxt/ui";

export interface ChatMessagePart {
  id: string;
  type: "text";
  text: string;
}

export interface ChatToolCall {
  name: string;
  input: unknown;
  output: string;
}

export interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  parts: ChatMessagePart[];
  createdAt: number;
  toolCalls?: ChatToolCall[];
}

export const useChat = () => {
  const status = useState<ChatStatus>("chat-status", () => "ready");

  const createId = () => {
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

  const clearMessages = () => {
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
