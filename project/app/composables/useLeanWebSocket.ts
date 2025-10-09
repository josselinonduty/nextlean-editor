import type { LeanRPCRequest, LeanRPCResponse } from "../../shared/types";

export const useLeanWebSocket = () => {
  const ws = ref<WebSocket | null>(null);
  const isConnected = ref(false);
  const sessionId = ref<string | null>(null);
  const error = ref<string | null>(null);
  const messageHandlers = new Map<number | string, (response: LeanRPCResponse) => void>();
  let messageIdCounter = 0;

  const connect = () => {
    if (ws.value) {
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/api/lean-server`;

    try {
      ws.value = new WebSocket(wsUrl);

      ws.value.onopen = () => {
        console.log("WebSocket connected");
        isConnected.value = true;
        error.value = null;
      };

      ws.value.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message.type === "session") {
            sessionId.value = message.data.sessionId;
            console.log("Session established:", sessionId.value);
          } else if (message.type === "rpc") {
            const rpcData = typeof message.data === "string" ? JSON.parse(message.data) : message.data;

            if (rpcData.id !== undefined && messageHandlers.has(rpcData.id)) {
              const handler = messageHandlers.get(rpcData.id);
              if (handler) {
                handler(rpcData);
                messageHandlers.delete(rpcData.id);
              }
            }
          } else if (message.type === "error") {
            console.error("Server error:", message.data);
            error.value = message.data.message || "Unknown error";
          }
        } catch (err) {
          console.error("Error parsing message:", err);
        }
      };

      ws.value.onerror = (event) => {
        console.error("WebSocket error:", event);
        error.value = "WebSocket connection error";
        isConnected.value = false;
      };

      ws.value.onclose = () => {
        console.log("WebSocket closed");
        isConnected.value = false;
        ws.value = null;
      };
    } catch (err) {
      console.error("Failed to create WebSocket:", err);
      error.value = "Failed to create WebSocket connection";
    }
  };

  const disconnect = () => {
    if (ws.value) {
      ws.value.close();
      ws.value = null;
      isConnected.value = false;
      sessionId.value = null;
    }
  };

  const sendRPCRequest = (method: string, params?: any): Promise<LeanRPCResponse> => {
    return new Promise((resolve, reject) => {
      if (!ws.value || !isConnected.value) {
        reject(new Error("WebSocket not connected"));
        return;
      }

      const messageId = messageIdCounter++;
      const request: LeanRPCRequest = {
        jsonrpc: "2.0",
        id: messageId,
        method,
        params,
      };

      messageHandlers.set(messageId, resolve);

      setTimeout(() => {
        if (messageHandlers.has(messageId)) {
          messageHandlers.delete(messageId);
          reject(new Error("Request timeout"));
        }
      }, 30000);

      try {
        ws.value.send(JSON.stringify(request));
      } catch (err) {
        messageHandlers.delete(messageId);
        reject(err);
      }
    });
  };

  onUnmounted(() => {
    disconnect();
  });

  return {
    connect,
    disconnect,
    sendRPCRequest,
    isConnected: readonly(isConnected),
    sessionId: readonly(sessionId),
    error: readonly(error),
  };
};
