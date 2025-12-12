import type {
  JsonRpcMessage,
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcError,
} from "#shared/types/jsonrpc";

export class JsonRpcMessageHandler {
  private buffer = "";
  private contentLength = 0;

  parseMessages(data: string): JsonRpcMessage[] {
    this.buffer += data;
    const messages: JsonRpcMessage[] = [];

    while (true) {
      try {
        if (this.contentLength === 0) {
          const headerEnd = this.buffer.indexOf("\r\n\r\n");
          if (headerEnd === -1) break;

          const headers = this.buffer.slice(0, headerEnd);
          const contentLengthRegex = /Content-Length: (\d+)/;
          const contentLengthMatch = contentLengthRegex.exec(headers);

          if (!contentLengthMatch) {
            this.buffer = "";
            this.contentLength = 0;
            break;
          }

          this.contentLength = Number.parseInt(contentLengthMatch[1], 10);
          this.buffer = this.buffer.slice(headerEnd + 4);
        }

        if (this.buffer.length < this.contentLength) break;

        const messageStr = this.buffer.slice(0, this.contentLength);
        this.buffer = this.buffer.slice(this.contentLength);
        this.contentLength = 0;

        try {
          const message = JSON.parse(messageStr) as JsonRpcMessage;
          messages.push(message);
        } catch {
          this.buffer = "";
          this.contentLength = 0;
          break;
        }
      } catch {
        this.buffer = "";
        this.contentLength = 0;
        break;
      }
    }

    return messages;
  }

  encodeMessage(message: JsonRpcMessage): string {
    const content = JSON.stringify(message);
    const contentLength = Buffer.byteLength(content, "utf8");
    return `Content-Length: ${contentLength}\r\n\r\n${content}`;
  }

  createRequest(
    method: string,
    params?: unknown,
    id?: string | number
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
    error: JsonRpcError
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
