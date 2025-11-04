import { useRuntimeConfig } from "#imports";
import { initializeDatabase } from "#server/db";
import {
  deserializeTags,
  parseEmbedding,
  type ProofRow,
} from "#server/utils/proofs";
import {
  createChatModel,
  createEmbeddingModel,
  cosineSimilarity,
} from "#server/utils/openrouter";
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";

type ChatRole = "user" | "assistant" | "system";

interface ChatMessageInput {
  role: ChatRole;
  content: string;
}

interface ChatRequestBody {
  messages: ChatMessageInput[];
}

type ProofsDatabase = Awaited<ReturnType<typeof initializeDatabase>>;

interface ProofEmbeddingData {
  id: string;
  title: string;
  content: string;
  tags: string[];
  embedding: number[];
  updatedAt: number;
}

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

const toMessage = (message: ChatMessageInput) => {
  if (message.role === "assistant") return new AIMessage(message.content);
  if (message.role === "system") return new SystemMessage(message.content);
  return new HumanMessage(message.content);
};

const buildContext = (
  related: Array<{
    title: string;
    tags: string[];
    content: string;
  }>
) => {
  if (related.length === 0) return "";
  return related
    .map((entry, index) => {
      const tagsLine = entry.tags.length > 0 ? entry.tags.join(", ") : "None";
      const snippet =
        entry.content.length > 1200
          ? `${entry.content.slice(0, 1200)}...`
          : entry.content;
      return `Proof ${index + 1}: ${
        entry.title
      }\nTags: ${tagsLine}\n${snippet}`;
    })
    .join("\n\n");
};

const hydrateProofEmbeddings = async (
  db: ProofsDatabase,
  embeddingModel: ReturnType<typeof createEmbeddingModel>
): Promise<ProofEmbeddingData[]> => {
  const entries: ProofEmbeddingData[] = [];
  const rows = db.prepare("SELECT * FROM proofs").all() as ProofRow[];
  const pending: ProofRow[] = [];

  for (const row of rows) {
    const vector = parseEmbedding(row.embedding);
    if (vector) {
      entries.push({
        id: row.id,
        title: row.title,
        content: row.content,
        tags: deserializeTags(row.tags),
        embedding: vector,
        updatedAt: row.updatedAt,
      });
    } else {
      pending.push(row);
    }
  }

  if (pending.length === 0) {
    return entries;
  }

  for (const row of pending) {
    try {
      const vector = await embeddingModel.embedQuery(row.content);
      const serialized = JSON.stringify(vector);
      db.prepare("UPDATE proofs SET embedding = ? WHERE id = ?").run(
        serialized,
        row.id
      );
      entries.push({
        id: row.id,
        title: row.title,
        content: row.content,
        tags: deserializeTags(row.tags),
        embedding: vector,
        updatedAt: row.updatedAt,
      });
    } catch (error) {
      console.error("Failed to generate embedding for proof", {
        id: row.id,
        error,
      });
    }
  }

  return entries;
};

const scoreProofs = (entries: ProofEmbeddingData[], queryVector: number[]) =>
  entries
    .map((entry) => ({
      entry,
      score: cosineSimilarity(queryVector, entry.embedding),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ entry, score }) => ({ entry, score }));

const formatRelatedProofs = (
  scored: Array<{ entry: ProofEmbeddingData; score: number }>
) =>
  scored.map(({ entry, score }) => {
    const snippet =
      entry.content.length > 320
        ? `${entry.content.slice(0, 320)}...`
        : entry.content;
    return {
      id: entry.id,
      title: entry.title,
      snippet,
      tags: entry.tags,
      updatedAt: entry.updatedAt,
      relevance: score,
    };
  });

const normalizeChatBody = (body: ChatRequestBody) => {
  if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "Messages payload is required",
    });
  }

  const normalizedMessages: ChatMessageInput[] = body.messages
    .filter(
      (message) =>
        message &&
        typeof message.content === "string" &&
        message.content.trim().length > 0
    )
    .map((message) => ({
      role: (message.role === "assistant" || message.role === "system"
        ? message.role
        : "user") as ChatRole,
      content: message.content.trim(),
    }));

  if (normalizedMessages.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "At least one valid message is required",
    });
  }

  const lastUserMessage = [...normalizedMessages]
    .reverse()
    .find((message) => message.role === "user");

  if (!lastUserMessage) {
    throw createError({
      statusCode: 400,
      statusMessage: "A user message is required",
    });
  }

  return { normalizedMessages, lastUserMessage };
};

const computeScoredProofs = async (
  embeddingModel: ReturnType<typeof createEmbeddingModel>,
  entries: ProofEmbeddingData[],
  query: string
) => {
  if (entries.length === 0)
    return [] as Array<{ entry: ProofEmbeddingData; score: number }>;
  try {
    const vector = await embeddingModel.embedQuery(query);
    return scoreProofs(entries, vector);
  } catch (error) {
    console.error("Failed to compute proof similarity", error);
    return [] as Array<{ entry: ProofEmbeddingData; score: number }>;
  }
};

export default defineEventHandler(async (event) => {
  const body = await readBody<ChatRequestBody>(event);
  const { normalizedMessages } = normalizeChatBody(body);

  const config = useRuntimeConfig(event);
  const apiKey = config.openRouterApiKey;
  if (!apiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: "OpenRouter API key is not configured",
    });
  }

  const proofEntries: ProofEmbeddingData[] = [];
  const scoredProofs: Array<{ entry: ProofEmbeddingData; score: number }> = [];
  const context = buildContext(
    scoredProofs.map(({ entry }) => ({
      title: entry.title,
      tags: entry.tags,
      content: entry.content,
    }))
  );

  const systemInstruction =
    "You are NextLean, an expert Lean 4 assistant. Answer succinctly, focus on Lean tactics, and explain reasoning when helpful. Cite retrieved proofs by title when they inform your answer.";

  const messages: Array<AIMessage | SystemMessage | HumanMessage> = [
    new SystemMessage(systemInstruction),
  ];
  if (context) {
    messages.push(
      new SystemMessage(
        `Relevant proofs from the library:\n\n${context}\n\nReference proofs by their titles when applicable.`
      )
    );
  }
  messages.push(...normalizedMessages.map(toMessage));

  const chatModel = createChatModel(apiKey);
  let reply = "";
  try {
    const response = await chatModel.invoke(messages);
    reply = getTextContent(response.content).trim();
  } catch (error) {
    console.error("OpenRouter chat invocation failed", error);
    const detail = (() => {
      if (!error || typeof error !== "object") return null;
      const asAny = error as Record<string, unknown>;
      if (typeof asAny.message === "string") {
        return asAny.message;
      }
      if (asAny.error && typeof asAny.error === "object") {
        const nested = asAny.error as Record<string, unknown>;
        if (typeof nested.message === "string") {
          return nested.message;
        }
      }
      const response = asAny.response as
        | { statusText?: string; data?: { error?: string; message?: string } }
        | undefined;
      if (response?.data?.error) return response.data.error;
      if (response?.data?.message) return response.data.message;
      if (typeof response?.statusText === "string") return response.statusText;
      return null;
    })();
    throw createError({
      statusCode: 502,
      statusMessage: detail ?? "Chat model request failed",
    });
  }

  if (reply.length === 0) {
    reply = "I was unable to generate a response. Please try asking again.";
  }

  const formattedProofs = formatRelatedProofs(scoredProofs);

  return {
    message: reply,
    relatedProofs: formattedProofs,
  };
});
