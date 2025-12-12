import { ChatOpenAI } from "@langchain/openai";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const OPENROUTER_HEADERS = {
  "HTTP-Referer": "https://nextlean.app",
  "X-Title": "NextLean",
} as const;

export const createChatModel = (apiKey: string) =>
  new ChatOpenAI({
    apiKey,
    model: "mistralai/devstral-2512:free",
    temperature: 0.2,
    maxTokens: 8192,
    configuration: {
      baseURL: OPENROUTER_BASE_URL,
      defaultHeaders: OPENROUTER_HEADERS,
    },
    maxRetries: 2,
  });
