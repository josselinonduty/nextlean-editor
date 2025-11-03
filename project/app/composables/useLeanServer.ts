import type { JsonRpcMessage, JsonRpcRequest } from "#shared/types/jsonrpc";

export function useLeanServer() {
  const ws = ref<WebSocket>();
  const connected = ref(false);
  const ready = ref(false);
  const pendingRequests = new Map<
    string | number,
    {
      resolve: (value: unknown) => void;
      reject: (error: Error) => void;
    }
  >();
  const messageHandlers = new Set<(message: JsonRpcMessage) => void>();

  function connect() {
    const protocol = globalThis.location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${protocol}//${globalThis.location.host}/api/ws`;

    ws.value = new WebSocket(url);

    ws.value.onopen = () => {
      connected.value = true;
      console.log("[WS] Connected to Lean server");
    };

    ws.value.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as JsonRpcMessage;

        if ("method" in message && message.method === "$/serverReady") {
          ready.value = true;
          console.log("[WS] Server is ready");
          return;
        }

        if ("id" in message && ("result" in message || "error" in message)) {
          const pending = pendingRequests.get(message.id);
          if (pending) {
            pendingRequests.delete(message.id);
            if (message.error) {
              pending.reject(new Error(message.error.message));
            } else {
              pending.resolve(message.result);
            }
          }
        }

        for (const handler of messageHandlers) {
          handler(message);
        }
      } catch (error) {
        console.error("[WS] Error parsing message:", error);
      }
    };

    ws.value.onclose = () => {
      connected.value = false;
      ready.value = false;
      console.log("[WS] Disconnected from Lean server");
    };

    ws.value.onerror = (error) => {
      console.error("[WS] WebSocket error:", error);
    };
  }

  async function sendRequest(
    method: string,
    params?: unknown
  ): Promise<unknown> {
    if (!ws.value || !connected.value) {
      throw new Error("Not connected to Lean server");
    }

    if (!ready.value) {
      throw new Error("Lean server not ready");
    }

    const id = Date.now();
    const request: JsonRpcRequest = {
      jsonrpc: "2.0",
      id,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      pendingRequests.set(id, { resolve, reject });
      ws.value!.send(JSON.stringify(request));

      setTimeout(() => {
        if (pendingRequests.has(id)) {
          pendingRequests.delete(id);
          reject(new Error(`Request timeout: ${method}`));
        }
      }, 30000);
    });
  }

  function sendNotification(method: string, params?: unknown): void {
    if (!ws.value || !connected.value) {
      throw new Error("Not connected to Lean server");
    }

    if (!ready.value) {
      throw new Error("Lean server not ready");
    }

    const notification = {
      jsonrpc: "2.0",
      method,
      params,
    };

    ws.value.send(JSON.stringify(notification));
  }

  function onMessage(handler: (message: JsonRpcMessage) => void): () => void {
    messageHandlers.add(handler);
    return () => messageHandlers.delete(handler);
  }

  function disconnect() {
    if (ws.value) {
      ws.value.close();
      pendingRequests.clear();
      messageHandlers.clear();
    }
  }

  onUnmounted(() => {
    disconnect();
  });

  return {
    connected,
    ready,
    connect,
    disconnect,
    sendRequest,
    sendNotification,
    onMessage,
  };
}
