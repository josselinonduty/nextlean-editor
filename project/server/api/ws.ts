import type { Peer } from "crossws";
import type { JsonRpcMessage } from "#shared/types/jsonrpc";

const sessions = new Map<
  string,
  { server: LeanServerManager; ready: boolean }
>();

export default defineWebSocketHandler({
  async open(peer: Peer) {
    console.log(`[WS] Client connected: ${peer.id}`);

    const server = new LeanServerManager();
    sessions.set(peer.id, { server, ready: false });

    server.onMessage((message: JsonRpcMessage) => {
      try {
        peer.send(JSON.stringify(message));
      } catch (error) {
        console.error(
          `[WS] Failed to send message to client ${peer.id}:`,
          error
        );
      }
    });

    try {
      await server.start("/tmp/lean-workspace");
      const session = sessions.get(peer.id);
      if (session) {
        session.ready = true;
      }
      console.log(`[WS] Lean server initialized for ${peer.id}`);

      peer.send(
        JSON.stringify({
          jsonrpc: "2.0",
          method: "$/serverReady",
          params: {},
        })
      );
    } catch (error) {
      console.error(`[WS] Failed to start Lean server for ${peer.id}:`, error);
      peer.close(1011, "Server initialization failed");
    }
  },

  async message(peer: Peer, message) {
    const session = sessions.get(peer.id);
    if (!session) {
      console.error(`[WS] No server session found for ${peer.id}`);
      peer.close(1011, "No server session");
      return;
    }

    if (!session.ready) {
      console.warn(`[WS] Server not ready for ${peer.id}, ignoring message`);
      return;
    }

    const { server } = session;

    try {
      const data = JSON.parse(message.text()) as JsonRpcMessage;

      if ("id" in data && "method" in data) {
        const result = await server.sendRequest(data.method, data.params);
        peer.send(
          JSON.stringify({
            jsonrpc: "2.0",
            id: data.id,
            result,
          })
        );
      } else if ("method" in data) {
        server.sendNotification(data.method, data.params);
      }
    } catch (error) {
      console.error(`[WS] Error handling message from ${peer.id}:`, error);
      peer.send(
        JSON.stringify({
          jsonrpc: "2.0",
          id: null,
          error: {
            code: -32603,
            message: error instanceof Error ? error.message : "Internal error",
          },
        })
      );
    }
  },

  async close(peer: Peer) {
    console.log(`[WS] Client disconnected: ${peer.id}`);
    const session = sessions.get(peer.id);
    if (session) {
      await session.server.stop();
      sessions.delete(peer.id);
    }
  },

  async error(peer: Peer, error) {
    console.error(`[WS] WebSocket error for ${peer.id}:`, error);
  },
});
