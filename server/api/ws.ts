import type { Peer } from "crossws";
import { join } from "node:path";
import type { JsonRpcMessage } from "#shared/types/jsonrpc";

const sessions = new Map<
  string,
  { server: LeanServerManager; ready: boolean }
>();

export default defineWebSocketHandler({
  async open(peer: Peer) {
    const server = new LeanServerManager();
    sessions.set(peer.id, { server, ready: false });

    server.onMessage((message: JsonRpcMessage) => {
      try {
        peer.send(JSON.stringify(message));
      } catch (error) {
        console.error(`Failed to send message to client:`, error);
      }
    });

    try {
      // Use the persistent lean_project directory
      // process.cwd() is usually the project root (where package.json is)
      const projectPath = join(process.cwd(), "lean_project");
      await server.start(projectPath);
      const session = sessions.get(peer.id);
      if (session) {
        session.ready = true;
      }

      peer.send(
        JSON.stringify({
          jsonrpc: "2.0",
          method: "$/serverReady",
          params: {
            rootUri: `file://${projectPath}`,
          },
        })
      );
    } catch (error) {
      console.error(`Failed to start Lean server:`, error);
      peer.close(1011, "Server initialization failed");
    }
  },

  async message(peer: Peer, message) {
    const session = sessions.get(peer.id);
    if (!session) {
      console.error(`No server session found`);
      peer.close(1011, "No server session");
      return;
    }

    if (!session.ready) {
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
      console.error(`Error handling message:`, error);
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
    const session = sessions.get(peer.id);
    if (session) {
      await session.server.stop();
      sessions.delete(peer.id);
    }
  },

  async error(peer: Peer, error) {
    console.error(`WebSocket error:`, error);
  },
});
