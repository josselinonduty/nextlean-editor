import { defineWebSocketHandler } from "h3";
import {
  createLeanServerSession,
  startLeanServer,
  getLeanServerSession,
  updateSessionActivity,
  terminateLeanServer,
} from "../utils/leanServer";

export default defineWebSocketHandler({
  open(peer) {
    console.log("WebSocket connection opened:", peer.id);

    const sessionId = createLeanServerSession();
    peer.sessionId = sessionId;

    const leanProcess = startLeanServer(sessionId);

    if (!leanProcess) {
      peer.send(
        JSON.stringify({
          type: "error",
          data: { message: "Failed to start Lean server" },
        })
      );
      peer.close();
      return;
    }

    peer.send(
      JSON.stringify({
        type: "session",
        data: { sessionId, status: "connected" },
      })
    );

    leanProcess.stdout?.on("data", (data) => {
      try {
        const message = data.toString();
        peer.send(
          JSON.stringify({
            type: "rpc",
            data: message,
          })
        );
      } catch (error) {
        console.error("Error sending data to client:", error);
      }
    });

    leanProcess.stderr?.on("data", (data) => {
      console.error(`Lean server stderr for session ${sessionId}:`, data.toString());
    });
  },

  message(peer, message) {
    if (!peer.sessionId) {
      console.error("No session ID found for peer:", peer.id);
      return;
    }

    updateSessionActivity(peer.sessionId);

    const session = getLeanServerSession(peer.sessionId);
    if (!session || !session.process) {
      peer.send(
        JSON.stringify({
          type: "error",
          data: { message: "Session not found or Lean server not running" },
        })
      );
      return;
    }

    try {
      const messageStr = typeof message === "string" ? message : message.text();

      if (session.process.stdin) {
        session.process.stdin.write(messageStr + "\n");
      }
    } catch (error) {
      console.error("Error handling message:", error);
      peer.send(
        JSON.stringify({
          type: "error",
          data: { message: "Failed to send message to Lean server" },
        })
      );
    }
  },

  close(peer, event) {
    console.log("WebSocket connection closed:", peer.id, event);

    if (peer.sessionId) {
      terminateLeanServer(peer.sessionId);
    }
  },

  error(peer, error) {
    console.error("WebSocket error for peer:", peer.id, error);

    if (peer.sessionId) {
      terminateLeanServer(peer.sessionId);
    }
  },
});

declare module "h3" {
  interface Peer {
    sessionId?: string;
  }
}
