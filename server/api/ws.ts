import type { Peer } from "crossws";
import { join } from "node:path";
import { existsSync } from "node:fs";
import type { JsonRpcMessage } from "#shared/types/jsonrpc";

const MAX_SESSIONS = 5;
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

interface Session {
  server: LeanServerManager;
  ready: boolean;
  lastActivity: number;
}

const sessions = new Map<string, Session>();

const cleanupStaleSessions = async () => {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.lastActivity > SESSION_TIMEOUT_MS) {
      console.log(`[WS] Cleaning up stale session: ${id}`);
      await session.server.stop();
      sessions.delete(id);
    }
  }
};

const cleanupInterval = setInterval(cleanupStaleSessions, 60000);

if (typeof process !== "undefined") {
  process.on("beforeExit", () => {
    clearInterval(cleanupInterval);
  });
}

export default defineWebSocketHandler({
  async open(peer: Peer) {
    await cleanupStaleSessions();

    if (sessions.size >= MAX_SESSIONS) {
      console.warn(
        `[WS] Max sessions (${MAX_SESSIONS}) reached, rejecting connection`,
      );
      peer.send(
        JSON.stringify({
          jsonrpc: "2.0",
          method: "$/serverError",
          params: {
            message: `Server at capacity. Maximum ${MAX_SESSIONS} concurrent sessions allowed. Please try again later.`,
            code: "SESSION_LIMIT_REACHED",
          },
        }),
      );
      peer.close(1013, "Maximum sessions reached");
      return;
    }

    const server = new LeanServerManager();
    const now = Date.now();
    sessions.set(peer.id, { server, ready: false, lastActivity: now });

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
      let projectPath = join(process.cwd(), "lean_project");
      if (!existsSync(projectPath)) {
        // Try parent directory (e.g. when running from .output)
        const parentPath = join(process.cwd(), "..", "lean_project");
        if (existsSync(parentPath)) {
          projectPath = parentPath;
        }
      }

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
        }),
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

    session.lastActivity = Date.now();

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
          }),
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
        }),
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
