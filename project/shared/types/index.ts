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

export interface LeanDiagnostic {
  file: string;
  line: number;
  column: number;
  severity: "error" | "warning" | "info";
  message: string;
}

export interface LeanResult {
  type: "success" | "error";
  output: string;
  diagnostics?: LeanDiagnostic[];
  goals?: string[];
  position?: { line: number; column: number };
}

export interface LeanServerInfo {
  status: "ready" | "error";
  version?: string;
  error?: string;
  capabilities?: string[];
}

export interface LeanAnalysis {
  goalState: string | null;
  typeInfo: string | null;
  commandResult: string | null;
  errors: Array<{ message: string; line: number }>;
  position: { line: number; column: number };
  hoverPosition: { line: number; column: number } | null;
  isHovering: boolean;
  hasContent: boolean;
}

export interface LeanServerSession {
  id: string;
  projectPath: string;
  pid?: number;
  createdAt: Date;
  lastActivity: Date;
}

export interface WebSocketMessage {
  type: "rpc" | "session" | "error" | "status";
  data: any;
}

export interface LeanRPCRequest {
  jsonrpc: "2.0";
  id?: number | string;
  method: string;
  params?: any;
}

export interface LeanRPCResponse {
  jsonrpc: "2.0";
  id?: number | string;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}
