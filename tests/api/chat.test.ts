import { describe, it, expect, vi } from "vitest";
import type {
  AIMessage,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";

vi.mock("#imports", () => ({
  useRuntimeConfig: vi.fn(() => ({
    openrouterApiKey: "test-api-key",
  })),
}));

vi.mock("#server/db", () => ({
  initializeDatabase: vi.fn(async () => ({
    prepare: vi.fn(() => ({
      all: vi.fn(() => []),
      get: vi.fn(() => undefined),
      run: vi.fn(() => ({ changes: 0 })),
    })),
  })),
}));

vi.mock("#server/utils/rateLimit", () => ({
  checkRateLimit: vi.fn(() => ({ allowed: true, remaining: 100 })),
}));

describe("Chat Stream Utilities", () => {
  describe("Message normalization", () => {
    const getTextContent = (value: unknown): string => {
      if (typeof value === "string") return value;
      if (Array.isArray(value)) {
        return value
          .map((item) => {
            if (typeof item === "string") return item;
            if (item && typeof item === "object" && "text" in item) {
              const text = (item as Record<string, unknown>).text;
              return typeof text === "string" ? text : "";
            }
            return "";
          })
          .join("");
      }
      if (value && typeof value === "object" && "text" in value) {
        const text = (value as Record<string, unknown>).text;
        return typeof text === "string" ? text : "";
      }
      return "";
    };

    it("should extract text from string", () => {
      expect(getTextContent("hello")).toBe("hello");
    });

    it("should extract text from array of strings", () => {
      expect(getTextContent(["hello", " ", "world"])).toBe("hello world");
    });

    it("should extract text from array of objects with text property", () => {
      expect(getTextContent([{ text: "hello" }, { text: " world" }])).toBe(
        "hello world",
      );
    });

    it("should extract text from object with text property", () => {
      expect(getTextContent({ text: "hello" })).toBe("hello");
    });

    it("should return empty string for null", () => {
      expect(getTextContent(null)).toBe("");
    });

    it("should return empty string for undefined", () => {
      expect(getTextContent(undefined)).toBe("");
    });

    it("should return empty string for number", () => {
      expect(getTextContent(123)).toBe("");
    });

    it("should handle mixed array content", () => {
      expect(getTextContent(["text", { text: " more" }, null, 123])).toBe(
        "text more",
      );
    });
  });

  describe("Message type conversion", () => {
    type ChatRole = "user" | "assistant" | "system";

    interface ChatMessageInput {
      role: ChatRole;
      content: string;
    }

    const normalizeMessages = (
      messages: ChatMessageInput[],
    ): ChatMessageInput[] => {
      return messages
        .filter(
          (message) =>
            message &&
            typeof message.content === "string" &&
            message.content.trim().length > 0,
        )
        .map((message) => ({
          role: (message.role === "assistant" || message.role === "system"
            ? message.role
            : "user") as ChatRole,
          content: message.content.trim(),
        }));
    };

    it("should normalize user messages", () => {
      const messages: ChatMessageInput[] = [{ role: "user", content: "Hello" }];

      const result = normalizeMessages(messages);

      expect(result).toHaveLength(1);
      expect(result[0].role).toBe("user");
      expect(result[0].content).toBe("Hello");
    });

    it("should normalize assistant messages", () => {
      const messages: ChatMessageInput[] = [
        { role: "assistant", content: "Hi there" },
      ];

      const result = normalizeMessages(messages);

      expect(result).toHaveLength(1);
      expect(result[0].role).toBe("assistant");
    });

    it("should normalize system messages", () => {
      const messages: ChatMessageInput[] = [
        { role: "system", content: "You are a helpful assistant" },
      ];

      const result = normalizeMessages(messages);

      expect(result).toHaveLength(1);
      expect(result[0].role).toBe("system");
    });

    it("should filter out empty messages", () => {
      const messages: ChatMessageInput[] = [
        { role: "user", content: "" },
        { role: "user", content: "   " },
        { role: "user", content: "Valid" },
      ];

      const result = normalizeMessages(messages);

      expect(result).toHaveLength(1);
      expect(result[0].content).toBe("Valid");
    });

    it("should trim message content", () => {
      const messages: ChatMessageInput[] = [
        { role: "user", content: "   Hello World   " },
      ];

      const result = normalizeMessages(messages);

      expect(result[0].content).toBe("Hello World");
    });

    it("should default unknown roles to user", () => {
      const messages = [{ role: "unknown" as ChatRole, content: "Test" }];

      const result = normalizeMessages(messages);

      expect(result[0].role).toBe("user");
    });
  });

  describe("Request validation", () => {
    interface ChatRequestBody {
      messages: Array<{ role: string; content: string }>;
      editorContent?: string;
      diagnostics?: Array<{ message: string }>;
    }

    const validateChatRequest = (
      body: unknown,
    ): { valid: boolean; error?: string } => {
      if (!body || typeof body !== "object") {
        return { valid: false, error: "Request body is required" };
      }

      const typedBody = body as ChatRequestBody;

      if (!Array.isArray(typedBody.messages)) {
        return { valid: false, error: "Messages array is required" };
      }

      if (typedBody.messages.length === 0) {
        return { valid: false, error: "At least one message is required" };
      }

      const hasValidMessage = typedBody.messages.some(
        (m) =>
          m && typeof m.content === "string" && m.content.trim().length > 0,
      );

      if (!hasValidMessage) {
        return {
          valid: false,
          error: "At least one valid message is required",
        };
      }

      return { valid: true };
    };

    it("should validate valid request", () => {
      const body = {
        messages: [{ role: "user", content: "Hello" }],
      };

      expect(validateChatRequest(body)).toEqual({ valid: true });
    });

    it("should reject null body", () => {
      expect(validateChatRequest(null)).toEqual({
        valid: false,
        error: "Request body is required",
      });
    });

    it("should reject missing messages", () => {
      expect(validateChatRequest({})).toEqual({
        valid: false,
        error: "Messages array is required",
      });
    });

    it("should reject empty messages array", () => {
      expect(validateChatRequest({ messages: [] })).toEqual({
        valid: false,
        error: "At least one message is required",
      });
    });

    it("should reject all empty content messages", () => {
      const body = {
        messages: [
          { role: "user", content: "" },
          { role: "user", content: "   " },
        ],
      };

      expect(validateChatRequest(body)).toEqual({
        valid: false,
        error: "At least one valid message is required",
      });
    });

    it("should accept request with optional editorContent", () => {
      const body = {
        messages: [{ role: "user", content: "Help" }],
        editorContent: "theorem test : 1 = 1 := rfl",
      };

      expect(validateChatRequest(body)).toEqual({ valid: true });
    });

    it("should accept request with optional diagnostics", () => {
      const body = {
        messages: [{ role: "user", content: "Fix error" }],
        diagnostics: [{ message: "type mismatch" }],
      };

      expect(validateChatRequest(body)).toEqual({ valid: true });
    });
  });

  describe("Context building", () => {
    const buildContext = (
      editorContent?: string,
      diagnostics?: Array<{ message: string; severity?: number }>,
    ): string => {
      const parts: string[] = [];

      if (editorContent && editorContent.trim().length > 0) {
        parts.push(
          `Current editor content:\n\`\`\`lean\n${editorContent}\n\`\`\``,
        );
      }

      if (diagnostics && diagnostics.length > 0) {
        const diagnosticList = diagnostics
          .map((d) => `- ${d.message}`)
          .join("\n");
        parts.push(`Current diagnostics:\n${diagnosticList}`);
      }

      return parts.join("\n\n");
    };

    it("should build context with editor content only", () => {
      const context = buildContext("theorem test : 1 = 1 := rfl");

      expect(context).toContain("Current editor content:");
      expect(context).toContain("theorem test : 1 = 1 := rfl");
    });

    it("should build context with diagnostics only", () => {
      const context = buildContext(undefined, [
        { message: "type mismatch" },
        { message: "unknown identifier" },
      ]);

      expect(context).toContain("Current diagnostics:");
      expect(context).toContain("- type mismatch");
      expect(context).toContain("- unknown identifier");
    });

    it("should build context with both editor content and diagnostics", () => {
      const context = buildContext("theorem test : 1 = 1 := rfl", [
        { message: "type mismatch" },
      ]);

      expect(context).toContain("Current editor content:");
      expect(context).toContain("Current diagnostics:");
    });

    it("should return empty string when no context", () => {
      expect(buildContext()).toBe("");
      expect(buildContext("")).toBe("");
      expect(buildContext("   ")).toBe("");
      expect(buildContext(undefined, [])).toBe("");
    });
  });
});
