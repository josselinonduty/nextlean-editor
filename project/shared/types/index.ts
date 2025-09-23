export interface LeanProof {
  id: string;
  title: string;
  content: string;
  author: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LLMResponse {
  suggestion: string;
  confidence: number;
  proof?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
}
