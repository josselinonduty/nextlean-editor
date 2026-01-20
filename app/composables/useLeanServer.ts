import type { JsonRpcMessage, JsonRpcRequest } from "#shared/types/jsonrpc";
import type {
  ConsoleMessage,
  LeanServerReadyParams,
  LeanServerStatusParams,
} from "#shared/types/lean";
import { clientLogger } from "#shared/utils/logger";

export interface UseLeanServerReturn {
  connected: Ref<boolean>;
  ready: Ref<boolean>;
  rootUri: Ref<string | null>;
  serverStatus: Ref<string>;
  consoleMessages: Ref<ConsoleMessage[]>;
  connect: () => void;
  disconnect: () => void;
  sendRequest: <T = unknown>(
    method: string,
    params?: unknown,
    timeoutMs?: number,
  ) => Promise<T>;
  sendNotification: (method: string, params?: unknown) => void;
  onMessage: (handler: (message: JsonRpcMessage) => void) => () => void;
}

export function useLeanServer(): UseLeanServerReturn {
  const ws = ref<WebSocket>();
  const connected = ref(false);
  const ready = ref(false);
  const rootUri = ref<string | null>(null);
  const serverStatus = ref<string>("disconnected");
  const consoleMessages = ref<ConsoleMessage[]>([]);
  const pendingRequests = new Map<
    string | number,
    {
      resolve: (value: unknown) => void;
      reject: (error: Error) => void;
    }
  >();
  const messageHandlers = new Set<(message: JsonRpcMessage) => void>();

  function connect(): void {
    const protocol = globalThis.location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${protocol}//${globalThis.location.host}/api/ws`;

    ws.value = new WebSocket(url);

    ws.value.onopen = () => {
      connected.value = true;
      serverStatus.value = "connected";
    };

    ws.value.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as JsonRpcMessage;

        if ("method" in message && message.method === "$/serverReady") {
          ready.value = true;
          serverStatus.value = "ready";
          const params = message.params as LeanServerReadyParams | undefined;
          if (params?.rootUri) {
            rootUri.value = params.rootUri;
          }
          return;
        }

        if ("method" in message && message.method === "$/serverStatus") {
          const params = message.params as LeanServerStatusParams;
          serverStatus.value = params.message;
          consoleMessages.value.push({
            message: params.message,
            type: params.type,
            timestamp: Date.now(),
          });
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
        clientLogger.error("useLeanServer.parseMessage", error, {
          rawData: event.data,
        });
      }
    };

    ws.value.onclose = () => {
      connected.value = false;
      ready.value = false;
      serverStatus.value = "disconnected";
    };

    ws.value.onerror = (): void => {
      serverStatus.value = "error";
    };
  }

  async function sendRequest<T = unknown>(
    method: string,
    params?: unknown,
    timeoutMs: number = 30000,
  ): Promise<T> {
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

    return new Promise<T>((resolve, reject) => {
      pendingRequests.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
      });
      ws.value!.send(JSON.stringify(request));

      if (timeoutMs > 0) {
        setTimeout(() => {
          if (pendingRequests.has(id)) {
            pendingRequests.delete(id);
            reject(new Error(`Request timeout: ${method}`));
          }
        }, timeoutMs);
      }
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
    rootUri,
    serverStatus,
    consoleMessages,
    connect,
    disconnect,
    sendRequest,
    sendNotification,
    onMessage,
  };
}
