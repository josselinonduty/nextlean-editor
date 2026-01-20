import type {
  JsonRpcMessage,
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcError,
} from "#shared/types/jsonrpc";

export class JsonRpcMessageHandler {
  createRequest(
    method: string,
    params?: unknown,
    id?: string | number,
  ): JsonRpcRequest {
    return {
      jsonrpc: "2.0",
      id: id ?? Date.now(),
      method,
      params,
    };
  }

  createNotification(method: string, params?: unknown): JsonRpcMessage {
    return {
      jsonrpc: "2.0",
      method,
      params,
    };
  }

  createResponse(id: string | number, result: unknown): JsonRpcResponse {
    return {
      jsonrpc: "2.0",
      id,
      result,
    };
  }

  createErrorResponse(
    id: string | number,
    error: JsonRpcError,
  ): JsonRpcResponse {
    return {
      jsonrpc: "2.0",
      id,
      error,
    };
  }

  isRequest(message: JsonRpcMessage): message is JsonRpcRequest {
    return "id" in message && "method" in message;
  }

  isResponse(message: JsonRpcMessage): message is JsonRpcResponse {
    return "id" in message && ("result" in message || "error" in message);
  }

  isNotification(message: JsonRpcMessage): message is JsonRpcMessage {
    return "method" in message && !("id" in message);
  }
}
