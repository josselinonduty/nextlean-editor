import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  StreamMessageReader,
  StreamMessageWriter,
  type Message,
  type NotificationMessage,
  type RequestMessage,
} from "vscode-jsonrpc/node.js";
import type { JsonRpcMessage } from "#shared/types/jsonrpc";
import { JsonRpcMessageHandler } from "./jsonrpc";

const HEALTH_CHECK_INTERVAL_MS = 30000;
const MAX_CONSECUTIVE_FAILURES = 3;

export class LeanServerManager {
  private process?: ChildProcess;
  private reader?: StreamMessageReader;
  private writer?: StreamMessageWriter;
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
  private healthCheckInterval?: ReturnType<typeof setInterval>;
  private consecutiveFailures = 0;
  private currentWorkspaceUri?: string;
  private isRestarting = false;
  private isInitialized = false;
  private isStopping = false;

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

    this.reader = new StreamMessageReader(this.process.stdout!);
    this.writer = new StreamMessageWriter(this.process.stdin!);

    this.reader.listen((message: Message) => {
      this.handleMessage(message as JsonRpcMessage);
    });

    this.reader.onError((error) => {
      console.error("[LeanServer] Reader error:", error);
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
    this.currentWorkspaceUri = workspaceUri;
    this.startHealthCheck();
    this.notifyClient("$/serverStatus", {
      message: "Lean server ready",
      type: "success",
    });
  }

  private startHealthCheck(): void {
    this.stopHealthCheck();
    this.consecutiveFailures = 0;

    this.healthCheckInterval = setInterval(() => {
      if (!this.process || this.isRestarting) return;

      if (this.process.exitCode !== null || this.process.killed) {
        this.consecutiveFailures++;
        console.warn(
          `[LeanServer] Health check failed - process not running (${this.consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES})`,
        );

        if (this.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          this.notifyClient("$/serverStatus", {
            message: "Lean server not running, attempting restart...",
            type: "error",
          });

          this.restart();
        }
        return;
      }

      this.consecutiveFailures = 0;
    }, HEALTH_CHECK_INTERVAL_MS);
  }

  private stopHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
  }

  private async restart(): Promise<void> {
    if (this.isRestarting || !this.currentWorkspaceUri) return;

    this.isRestarting = true;
    console.log("[LeanServer] Restarting server...");

    try {
      await this.stop();
      await this.start(this.currentWorkspaceUri);
      this.notifyClient("$/serverStatus", {
        message: "Lean server restarted successfully",
        type: "success",
      });
    } catch (error) {
      console.error("[LeanServer] Failed to restart:", error);
      this.notifyClient("$/serverStatus", {
        message: "Failed to restart Lean server",
        type: "error",
      });
    } finally {
      this.isRestarting = false;
    }
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
      0,
    );

    console.log("Lean server initialized");
    this.sendNotification("initialized", {});
    this.isInitialized = true;
  }

  async sendRequest(
    method: string,
    params?: object | unknown[],
    timeoutMs: number = 30000,
  ): Promise<unknown> {
    if (!this.writer) {
      throw new Error("Lean server not running");
    }

    const id = Date.now();
    const request: RequestMessage = {
      jsonrpc: "2.0",
      id,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      this.writer!.write(request);

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

  sendNotification(method: string, params?: object | unknown[]): void {
    if (!this.writer) {
      throw new Error("Lean server not running");
    }

    const notification: NotificationMessage = {
      jsonrpc: "2.0",
      method,
      params,
    };
    this.writer.write(notification);
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
    this.stopHealthCheck();
    this.reader?.dispose();
    this.writer?.dispose();
    this.reader = undefined;
    this.writer = undefined;
    this.pendingRequests.clear();
    this.messageCallbacks.clear();
    this.process = undefined;
    this.isInitialized = false;
    this.isStopping = false;
  }

  async stop(): Promise<void> {
    if (this.isStopping) return;
    this.isStopping = true;
    this.stopHealthCheck();

    if (!this.process) {
      this.isStopping = false;
      return;
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.process?.kill("SIGKILL");
        this.cleanup();
        resolve();
      }, 5000);

      this.process?.once("exit", () => {
        clearTimeout(timeout);
        this.cleanup();
        resolve();
      });

      (async () => {
        try {
          if (this.isInitialized && this.writer) {
            try {
              // Send shutdown request and wait for response with timeout
              await this.sendRequest("shutdown", {}, 2000);
            } catch (e) {
              console.warn("[LeanServer] Shutdown request failed:", e);
            }

            try {
              // Send exit notification only if writer is still available
              if (this.writer) {
                this.sendNotification("exit");
              }
            } catch (e) {
              // Ignore if stream is destroyed
            }
          } else {
            this.process?.kill("SIGTERM");
          }
        } catch (e) {
          console.error("[LeanServer] Error during stop sequence:", e);
          this.process?.kill("SIGTERM");
        }
      })();
    });
  }
}
