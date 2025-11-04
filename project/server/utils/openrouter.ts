import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const OPENROUTER_HEADERS = {
  "HTTP-Referer": "https://nextlean.app",
  "X-Title": "NextLean",
} as const;

export const createChatModel = (apiKey: string) =>
  new ChatOpenAI({
    apiKey,
    model: "moonshotai/kimi-k2:free",
    temperature: 0.2,
    maxTokens: 1024,
    configuration: {
      baseURL: OPENROUTER_BASE_URL,
      defaultHeaders: OPENROUTER_HEADERS,
    },
    maxRetries: 2,
  });

export const createEmbeddingModel = (apiKey: string) =>
  new OpenAIEmbeddings({
    apiKey,
    model: "mistralai/codestral-embed-2505",
    configuration: {
      baseURL: OPENROUTER_BASE_URL,
      defaultHeaders: OPENROUTER_HEADERS,
    },
  });

export const cosineSimilarity = (a: number[], b: number[]): number => {
  const length = Math.min(a.length, b.length);
  if (length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < length; i += 1) {
    const ai = a[i];
    const bi = b[i];
    dot += ai * bi;
    normA += ai * ai;
    normB += bi * bi;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};
