import { spawn, ChildProcess } from "node:child_process";
import { v4 as uuidv4 } from "uuid";
import type { LeanServerSession } from "../../shared/types";

const activeSessions = new Map<string, LeanServerSession & { process: ChildProcess }>();

export function createLeanServerSession(projectPath: string = "/tmp/lean-project"): string {
  const sessionId = uuidv4();
  const session: LeanServerSession = {
    id: sessionId,
    projectPath,
    createdAt: new Date(),
    lastActivity: new Date(),
  };

  activeSessions.set(sessionId, {
    ...session,
    process: null as any,
  });

  return sessionId;
}

export function startLeanServer(sessionId: string): ChildProcess | null {
  const session = activeSessions.get(sessionId);
  if (!session) {
    console.error(`Session ${sessionId} not found`);
    return null;
  }

  try {
    let leanProcess: ChildProcess;

    const leanPath = process.env.LEAN_PATH || "lean";
    const lakePath = process.env.LAKE_PATH || "lake";

    try {
      leanProcess = spawn(lakePath, ["serve", "--"], {
        cwd: session.projectPath,
        stdio: ["pipe", "pipe", "pipe"],
        env: {
          ...process.env,
          PATH: process.env.PATH,
        },
      });
    } catch (error) {
      console.warn("Failed to start with lake serve, trying lean --server");
      leanProcess = spawn(leanPath, ["--server"], {
        cwd: session.projectPath,
        stdio: ["pipe", "pipe", "pipe"],
        env: {
          ...process.env,
          PATH: process.env.PATH,
        },
      });
    }

    session.process = leanProcess;
    session.pid = leanProcess.pid;

    leanProcess.on("error", (error) => {
      console.error(`Lean server error for session ${sessionId}:`, error);
    });

    leanProcess.on("exit", (code, signal) => {
      console.log(`Lean server exited for session ${sessionId}:`, { code, signal });
      if (activeSessions.has(sessionId)) {
        activeSessions.delete(sessionId);
      }
    });

    return leanProcess;
  } catch (error) {
    console.error(`Failed to start Lean server for session ${sessionId}:`, error);
    return null;
  }
}

export function getLeanServerSession(sessionId: string): (LeanServerSession & { process: ChildProcess }) | undefined {
  return activeSessions.get(sessionId);
}

export function updateSessionActivity(sessionId: string): void {
  const session = activeSessions.get(sessionId);
  if (session) {
    session.lastActivity = new Date();
  }
}

export function terminateLeanServer(sessionId: string): void {
  const session = activeSessions.get(sessionId);
  if (session && session.process) {
    session.process.kill("SIGTERM");
    activeSessions.delete(sessionId);
  }
}

export function cleanupInactiveSessions(timeoutMs: number = 30 * 60 * 1000): void {
  const now = new Date().getTime();
  for (const [sessionId, session] of activeSessions.entries()) {
    const lastActivity = session.lastActivity.getTime();
    if (now - lastActivity > timeoutMs) {
      console.log(`Cleaning up inactive session ${sessionId}`);
      terminateLeanServer(sessionId);
    }
  }
}

export function getAllActiveSessions(): LeanServerSession[] {
  return Array.from(activeSessions.values()).map(({ process, ...session }) => session);
}
