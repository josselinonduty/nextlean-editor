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

    peer.send(
      JSON.stringify({
        type: "session",
        data: { sessionId, status: "connected" },
      })
    );
  },

  message(peer, message) {
    if (!peer.sessionId) {
      console.error("No session ID found for peer:", peer.id);
      return;
    }

    updateSessionActivity(peer.sessionId);

    let session = getLeanServerSession(peer.sessionId);
    if (!session) {
      peer.send(
        JSON.stringify({
          type: "error",
          data: { message: "Session not found" },
        })
      );
      return;
    }

    if (!session.process || !session.pid) {
      console.log(`Starting Lean server for session ${peer.sessionId}`);
      const leanProcess = startLeanServer(peer.sessionId);

      if (!leanProcess) {
        peer.send(
          JSON.stringify({
            type: "error",
            data: { message: "Failed to start Lean server. Is Lean 4 installed?" },
          })
        );
        return;
      }

      session = getLeanServerSession(peer.sessionId);
      if (!session) {
        peer.send(
          JSON.stringify({
            type: "error",
            data: { message: "Session lost after starting Lean server" },
          })
        );
        return;
      }

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
        console.error(`Lean server stderr for session ${peer.sessionId}:`, data.toString());
      });

      peer.send(
        JSON.stringify({
          type: "status",
          data: { message: "Lean server started" },
        })
      );
    }

    try {
      const messageStr = typeof message === "string" ? message : message.text();

      if (session.process && session.process.stdin) {
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
