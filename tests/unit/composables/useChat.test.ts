import { describe, it, expect, vi, beforeEach } from "vitest";

describe("useChat", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  const loadUseChat = async () => {
    const mod = await import("~/composables/useChat");
    return mod.useChat;
  };

  describe("initial state", () => {
    it("should initialize with ready status", async () => {
      const useChat = await loadUseChat();
      const { status } = useChat();

      expect(status.value).toBe("ready");
    });

    it("should initialize with welcome message", async () => {
      const useChat = await loadUseChat();
      const { messages } = useChat();

      expect(messages.value).toHaveLength(1);
      expect(messages.value[0].role).toBe("assistant");
      expect(messages.value[0].parts[0].text).toContain(
        "Hello! I am ready to help",
      );
    });

    it("should have message with proper structure", async () => {
      const useChat = await loadUseChat();
      const { messages } = useChat();

      const firstMessage = messages.value[0];

      expect(firstMessage.id).toBeDefined();
      expect(typeof firstMessage.id).toBe("string");
      expect(firstMessage.createdAt).toBeDefined();
      expect(typeof firstMessage.createdAt).toBe("number");
      expect(firstMessage.parts).toBeInstanceOf(Array);
      expect(firstMessage.parts[0].type).toBe("text");
    });
  });

  describe("createId", () => {
    it("should generate unique ids", async () => {
      const useChat = await loadUseChat();
      const { createId } = useChat();

      const id1 = createId();
      const id2 = createId();
      const id3 = createId();

      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);
    });

    it("should generate string ids", async () => {
      const useChat = await loadUseChat();
      const { createId } = useChat();

      const id = createId();

      expect(typeof id).toBe("string");
      expect(id.length).toBeGreaterThan(0);
    });
  });

  describe("createPart", () => {
    it("should create a text part with id", async () => {
      const useChat = await loadUseChat();
      const { createPart } = useChat();

      const part = createPart("Hello, world!");

      expect(part.id).toBeDefined();
      expect(part.type).toBe("text");
      expect(part.text).toBe("Hello, world!");
    });

    it("should create parts with unique ids", async () => {
      const useChat = await loadUseChat();
      const { createPart } = useChat();

      const part1 = createPart("First");
      const part2 = createPart("Second");

      expect(part1.id).not.toBe(part2.id);
    });
  });

  describe("clearMessages", () => {
    it("should reset to initial welcome message", async () => {
      const useChat = await loadUseChat();
      const { messages, clearMessages } = useChat();

      messages.value.push({
        id: "test-id",
        role: "user",
        parts: [{ id: "part-id", type: "text", text: "User message" }],
        createdAt: Date.now(),
      });

      expect(messages.value.length).toBeGreaterThan(1);

      clearMessages();

      expect(messages.value).toHaveLength(1);
      expect(messages.value[0].role).toBe("assistant");
      expect(messages.value[0].parts[0].text).toContain(
        "Hello! I am ready to help",
      );
    });

    it("should reset status to ready", async () => {
      const useChat = await loadUseChat();
      const { status, clearMessages } = useChat();

      status.value = "streaming";

      clearMessages();

      expect(status.value).toBe("ready");
    });

    it("should generate new id for welcome message", async () => {
      const useChat = await loadUseChat();
      const { messages, clearMessages } = useChat();

      const originalId = messages.value[0].id;

      clearMessages();

      expect(messages.value[0].id).not.toBe(originalId);
    });
  });

  describe("messages manipulation", () => {
    it("should allow adding messages", async () => {
      const useChat = await loadUseChat();
      const { messages, createId, createPart } = useChat();

      const userMessage = {
        id: createId(),
        role: "user" as const,
        parts: [createPart("How do I prove 1 + 1 = 2?")],
        createdAt: Date.now(),
      };

      messages.value.push(userMessage);

      expect(messages.value).toHaveLength(2);
      expect(messages.value[1].role).toBe("user");
      expect(messages.value[1].parts[0].text).toBe("How do I prove 1 + 1 = 2?");
    });

    it("should maintain message order", async () => {
      const useChat = await loadUseChat();
      const { messages, createId, createPart } = useChat();

      messages.value.push({
        id: createId(),
        role: "user",
        parts: [createPart("First user message")],
        createdAt: Date.now(),
      });

      messages.value.push({
        id: createId(),
        role: "assistant",
        parts: [createPart("First assistant response")],
        createdAt: Date.now(),
      });

      messages.value.push({
        id: createId(),
        role: "user",
        parts: [createPart("Second user message")],
        createdAt: Date.now(),
      });

      expect(messages.value).toHaveLength(4);
      expect(messages.value[0].role).toBe("assistant");
      expect(messages.value[1].role).toBe("user");
      expect(messages.value[2].role).toBe("assistant");
      expect(messages.value[3].role).toBe("user");
    });
  });

  describe("status management", () => {
    it("should allow updating status", async () => {
      const useChat = await loadUseChat();
      const { status } = useChat();

      expect(status.value).toBe("ready");

      status.value = "streaming";
      expect(status.value).toBe("streaming");

      status.value = "ready";
      expect(status.value).toBe("ready");
    });
  });

  describe("state management", () => {
    it("should persist messages within same composable instance", async () => {
      const useChat = await loadUseChat();
      const { messages, createId, createPart } = useChat();

      const initialLength = messages.value.length;

      messages.value.push({
        id: createId(),
        role: "user",
        parts: [createPart("Test message")],
        createdAt: Date.now(),
      });

      expect(messages.value).toHaveLength(initialLength + 1);
      expect(messages.value[initialLength].parts[0].text).toBe("Test message");
    });
  });
});
