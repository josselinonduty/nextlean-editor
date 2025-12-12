import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { JsonRpcMessage } from "#shared/types/jsonrpc";
import { JsonRpcMessageHandler } from "./jsonrpc";

export class LeanServerManager {
  private process?: ChildProcess;
  private readonly messageHandler = new JsonRpcMessageHandler();
  private readonly pendingRequests = new Map<
    string | number,
    {
      resolve: (value: unknown) => void;
      reject: (error: Error) => void;
    }
  >();
  private readonly messageCallbacks = new Set<
    (message: JsonRpcMessage) => void
  >();

  async start(workspaceUri: string): Promise<void> {
    if (this.process) {
      throw new Error("Lean server already running");
    }

    this.notifyClient("$/serverStatus", {
      message: "Starting Lean server...",
      type: "info",
    });

    const leanPath = join(homedir(), ".elan", "bin", "lean");

    if (!existsSync(leanPath)) {
      this.notifyClient("$/serverStatus", {
        message: `Lean executable not found at ${leanPath}`,
        type: "error",
      });
      throw new Error(`Lean executable not found at ${leanPath}`);
    }

    this.notifyClient("$/serverStatus", {
      message: "Spawning Lean process...",
      type: "info",
    });

    // Use lake serve instead of lean --server
    const lakePath = join(homedir(), ".elan", "bin", "lake");

    console.log(`[LeanServer] Spawning lake from: ${lakePath}`);
    console.log(`[LeanServer] Workspace URI (cwd): ${workspaceUri}`);

    if (!existsSync(lakePath)) {
      // Fallback to lean if lake is not found, but warn
      console.warn("Lake not found, falling back to lean --server");
      this.process = spawn(leanPath, ["--server"], {
        stdio: ["pipe", "pipe", "pipe"],
        env: process.env,
        cwd: workspaceUri, // Use the workspaceUri as cwd
      });
    } else {
      this.process = spawn(lakePath, ["serve", "--"], {
        stdio: ["pipe", "pipe", "pipe"],
        env: process.env,
        cwd: workspaceUri, // Important: run lake serve in the project directory
      });
    }

    this.process.on("error", (err) => {
      console.error("[LeanServer] Spawn error:", err);
      this.notifyClient("$/serverStatus", {
        message: `Failed to spawn Lean server: ${err.message}`,
        type: "error",
      });
    });

    this.process.stdout?.on("data", (data: Buffer) => {
      const messages = this.messageHandler.parseMessages(data.toString());
      for (const message of messages) {
        this.handleMessage(message);
      }
    });

    this.process.stderr?.on("data", (data: Buffer) => {
      const message = data.toString();
      console.error("Lean server error:", message);
      this.notifyClient("$/serverStatus", {
        message: `Lean stderr: ${message}`,
        type: "error",
      });
    });

    this.process.on("exit", (code) => {
      if (code !== 0) {
        console.error(`Lean server exited with code: ${code}`);
        this.notifyClient("$/serverStatus", {
          message: `Lean server exited with code: ${code}`,
          type: "error",
        });
      }
      this.cleanup();
    });

    this.notifyClient("$/serverStatus", {
      message: "Initializing Lean server...",
      type: "info",
    });
    await this.initialize(workspaceUri);
    this.notifyClient("$/serverStatus", {
      message: "Lean server ready",
      type: "success",
    });
  }

  private notifyClient(method: string, params?: unknown) {
    const notification: JsonRpcMessage = {
      jsonrpc: "2.0",
      method,
      params,
    };
    for (const callback of this.messageCallbacks) {
      callback(notification);
    }
  }

  private async initialize(rootUri: string): Promise<void> {
    await this.sendRequest(
      "initialize",
      {
        processId: process.pid,
        rootUri,
        capabilities: {
          textDocument: {
            synchronization: {
              dynamicRegistration: false,
              willSave: false,
              willSaveWaitUntil: false,
              didSave: false,
            },
            completion: {
              dynamicRegistration: false,
              completionItem: {
                snippetSupport: true,
              },
            },
            hover: {
              dynamicRegistration: false,
              contentFormat: ["plaintext", "markdown"],
            },
            definition: {
              dynamicRegistration: false,
            },
            documentSymbol: {
              dynamicRegistration: false,
            },
          },
          workspace: {
            workspaceFolders: true,
            configuration: true,
          },
        },
        workspaceFolders: [
          {
            uri: rootUri,
            name: "workspace",
          },
        ],
      },
      0
    );

    console.log("Lean server initialized");
    this.sendNotification("initialized", {});
  }

  async sendRequest(
    method: string,
    params?: unknown,
    timeoutMs: number = 30000
  ): Promise<unknown> {
    if (!this.process?.stdin) {
      throw new Error("Lean server not running");
    }

    const id = Date.now();
    const request = this.messageHandler.createRequest(method, params, id);
    const encoded = this.messageHandler.encodeMessage(request);

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      this.process!.stdin!.write(encoded);

      if (timeoutMs > 0) {
        setTimeout(() => {
          if (this.pendingRequests.has(id)) {
            this.pendingRequests.delete(id);
            reject(new Error(`Request timeout: ${method}`));
          }
        }, timeoutMs);
      }
    });
  }

  sendNotification(method: string, params?: unknown): void {
    if (!this.process?.stdin) {
      throw new Error("Lean server not running");
    }

    const notification = this.messageHandler.createNotification(method, params);
    const encoded = this.messageHandler.encodeMessage(notification);
    this.process.stdin.write(encoded);
  }

  onMessage(callback: (message: JsonRpcMessage) => void): () => void {
    this.messageCallbacks.add(callback);
    return () => this.messageCallbacks.delete(callback);
  }

  private handleMessage(message: JsonRpcMessage): void {
    if (this.messageHandler.isResponse(message)) {
      const pending = this.pendingRequests.get(message.id);
      if (pending) {
        this.pendingRequests.delete(message.id);
        if (message.error) {
          pending.reject(new Error(message.error.message));
        } else {
          pending.resolve(message.result);
        }
      }
    }

    for (const callback of this.messageCallbacks) {
      callback(message);
    }
  }

  private cleanup(): void {
    this.pendingRequests.clear();
    this.messageCallbacks.clear();
    this.process = undefined;
  }

  async stop(): Promise<void> {
    if (!this.process) return;

    this.sendNotification("exit");

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.process?.kill("SIGKILL");
        resolve();
      }, 5000);

      this.process?.once("exit", () => {
        clearTimeout(timeout);
        this.cleanup();
        resolve();
      });
    });
  }
}
