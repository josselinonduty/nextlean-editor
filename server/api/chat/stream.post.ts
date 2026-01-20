import { useRuntimeConfig } from "#imports";
import { initializeDatabase } from "#server/db";
import { findProofById, type ProofRow } from "#server/utils/proofs";
import { deserializeTags } from "#shared/utils/tags";
import { createChatModel } from "#server/utils/openrouter";
import { checkRateLimit } from "#server/utils/rateLimit";
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
  type BaseMessage,
} from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { appendFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { exec } from "node:child_process";
import type { Diagnostic } from "#shared/types/lsp";
import type {
  ListProofsInput,
  GetProofInput,
  ReadEditorInput,
  AddDependencyInput,
  ToolCallResult,
} from "#shared/types/tools";

type ChatRole = "user" | "assistant" | "system";

interface ChatMessageInput {
  role: ChatRole;
  content: string;
}

interface ChatRequestBody {
  messages: ChatMessageInput[];
  editorContent?: string;
  diagnostics?: Diagnostic[];
}

const getTextContent = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && "text" in item) {
          const text = (item as Record<string, unknown>).text;
          return typeof text === "string" ? text : "";
        }
        return "";
      })
      .join("");
  }
  if (value && typeof value === "object" && "text" in value) {
    const text = (value as Record<string, unknown>).text;
    return typeof text === "string" ? text : "";
  }
  return "";
};

const toMessage = (message: ChatMessageInput) => {
  if (message.role === "assistant") return new AIMessage(message.content);
  if (message.role === "system") return new SystemMessage(message.content);
  return new HumanMessage(message.content);
};

const normalizeChatBody = (body: ChatRequestBody) => {
  if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "Messages payload is required",
    });
  }

  const normalizedMessages: ChatMessageInput[] = body.messages
    .filter(
      (message) =>
        message &&
        typeof message.content === "string" &&
        message.content.trim().length > 0,
    )
    .map((message) => ({
      role: (message.role === "assistant" || message.role === "system"
        ? message.role
        : "user") as ChatRole,
      content: message.content.trim(),
    }));

  if (normalizedMessages.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "At least one valid message is required",
    });
  }

  return {
    normalizedMessages,
    editorContent: body.editorContent || "",
    diagnostics: body.diagnostics || [],
  };
};

interface StreamEvent {
  type: "token" | "tool_start" | "tool_end" | "done" | "error";
  content?: string;
  name?: string;
  input?: unknown;
  output?: string;
  message?: string;
  steps?: ToolCallResult[];
}

export default defineEventHandler(async (event) => {
  const ip =
    getHeader(event, "x-forwarded-for") ||
    event.node.req.socket.remoteAddress ||
    "unknown";

  const { allowed, retryAfter } = checkRateLimit(ip);

  if (!allowed) {
    setHeader(event, "Retry-After", retryAfter ?? 60);
    throw createError({
      statusCode: 429,
      statusMessage: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
    });
  }

  const body = await readBody<ChatRequestBody>(event);
  const { normalizedMessages, editorContent, diagnostics } =
    normalizeChatBody(body);

  const config = useRuntimeConfig(event);
  const apiKey = config.openRouterApiKey;
  if (!apiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: "OpenRouter API key is not configured",
    });
  }

  setHeader(event, "Content-Type", "text/event-stream");
  setHeader(event, "Cache-Control", "no-cache");
  setHeader(event, "Connection", "keep-alive");
  setHeader(event, "X-Accel-Buffering", "no");

  const write = (data: StreamEvent) => {
    event.node.res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const db = await initializeDatabase();

  const listProofsTool = tool(
    async (input: ListProofsInput) => {
      const { query } = input;
      const rows = db
        .prepare("SELECT id, title, tags FROM proofs")
        .all() as Pick<ProofRow, "id" | "title" | "tags">[];
      const results = rows.map((row) => ({
        id: row.id,
        title: row.title,
        tags: deserializeTags(row.tags),
      }));

      if (!query || query.trim() === "")
        return JSON.stringify(results.slice(0, 20));

      const lowerQuery = query.toLowerCase();
      const filtered = results.filter(
        (r) =>
          r.title.toLowerCase().includes(lowerQuery) ||
          r.tags.some((t) => t.toLowerCase().includes(lowerQuery)),
      );
      return JSON.stringify(filtered.slice(0, 10));
    },
    {
      name: "list_proofs",
      description:
        "List available proofs in the library. Can filter by query string matching title or tags.",
      schema: z.object({
        query: z
          .string()
          .describe(
            "Search query to filter proofs. Pass an empty string to list all proofs.",
          ),
      }),
    },
  );

  const getProofTool = tool(
    async (input: GetProofInput) => {
      const { id } = input;
      const proof = findProofById(db, id);
      if (!proof) return "Proof not found.";
      return JSON.stringify({
        id: proof.id,
        title: proof.title,
        content: proof.content,
        tags: deserializeTags(proof.tags),
      });
    },
    {
      name: "get_proof",
      description: "Get the full content of a specific proof by its ID.",
      schema: z.object({
        id: z.string().describe("The ID of the proof to retrieve"),
      }),
    },
  );

  const readEditorTool = tool(
    async (input: ReadEditorInput) => {
      const { startLine, endLine } = input;
      const lines = editorContent.split("\n");
      const totalLines = lines.length;

      if (startLine === undefined && endLine === undefined) {
        return JSON.stringify({
          totalLines,
          content: editorContent || "",
        });
      }

      const start = Math.max(0, (startLine || 1) - 1);
      const end = endLine ? Math.min(totalLines, endLine) : totalLines;

      const content = lines.slice(start, end).join("\n");
      return JSON.stringify({
        totalLines,
        startLine: start + 1,
        endLine: end,
        content: content || "",
      });
    },
    {
      name: "read_editor",
      description:
        "Read the content of the editor. Returns JSON with totalLines and content. If startLine/endLine are omitted, reads the entire file.",
      schema: z.object({
        startLine: z
          .number()
          .optional()
          .describe("Start line number (1-based)"),
        endLine: z.number().optional().describe("End line number (1-based)"),
      }),
    },
  );

  const editEditorTool = tool(
    async () => {
      return "Edit scheduled for client execution.";
    },
    {
      name: "edit_editor",
      description:
        "Edit the content of the editor. Replaces lines from startLine to endLine with newContent.",
      schema: z.object({
        startLine: z.number().describe("Start line number (1-based)"),
        endLine: z.number().describe("End line number (1-based)"),
        newContent: z.string().describe("The new content to insert"),
      }),
    },
  );

  const addDependencyTool = tool(
    async (input: AddDependencyInput) => {
      const { name, url } = input;
      const projectPath = join(process.cwd(), "lean_project");
      const lakefilePath = join(projectPath, "lakefile.lean");

      if (!existsSync(lakefilePath)) {
        return "Error: lakefile.lean not found.";
      }

      const dependencyString = `\nrequire ${name} from git\n  "${url}"\n`;

      try {
        appendFileSync(lakefilePath, dependencyString);

        exec("lake update", { cwd: projectPath }, (error, stdout) => {
          if (error) {
            console.error(`lake update error: ${error}`);
            return;
          }
          console.log(`lake update stdout: ${stdout}`);
        });

        return `Dependency '${name}' added to lakefile.lean. 'lake update' started in background.`;
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : "Unknown error";
        return `Failed to add dependency: ${errorMessage}`;
      }
    },
    {
      name: "add_dependency",
      description: "Add a dependency to the Lake project (e.g., Mathlib).",
      schema: z.object({
        name: z.string().describe("The name of the dependency (e.g., mathlib)"),
        url: z.string().describe("The git URL of the dependency"),
      }),
    },
  );

  const getDiagnosticsTool = tool(
    async () => {
      if (!diagnostics || diagnostics.length === 0) {
        return "No diagnostics available.";
      }
      return JSON.stringify(diagnostics, null, 2);
    },
    {
      name: "get_diagnostics",
      description:
        "Get the current diagnostics (errors, warnings, info) from the Lean editor.",
      schema: z.object({}),
    },
  );

  const tools = [
    listProofsTool,
    getProofTool,
    readEditorTool,
    editEditorTool,
    addDependencyTool,
    getDiagnosticsTool,
  ];
  const toolsByName = {
    list_proofs: listProofsTool,
    get_proof: getProofTool,
    read_editor: readEditorTool,
    edit_editor: editEditorTool,
    add_dependency: addDependencyTool,
    get_diagnostics: getDiagnosticsTool,
  };

  const chatModel = createChatModel(apiKey).bindTools(tools);

  const toolDescriptions = tools
    .map((t) => `- ${t.name}: ${t.description}`)
    .join("\n");

  const systemInstruction = `You are NextLean, an expert Lean 4 assistant.
Your primary goal is to assist the user in the editor. You should actively edit the content of the editor to help the user.
You have access to the following tools to help you answer questions about the proof library and manipulate the editor:

${toolDescriptions}

PROTOCOL:
- If the user asks about existing proofs or the library:
  1. Call 'list_proofs' with an empty string query ("") to list ALL available proofs.
  2. Inspect the list and use 'get_proof' for details.
- If the user asks to read or modify the current editor content:
  1. Use 'read_editor' to inspect the code.
  2. Use 'edit_editor' to make changes.
- If the user asks about errors or checking the code:
  1. Use 'get_diagnostics' to see current errors/warnings.
  2. Use 'read_editor' to see the context.
- Always answer the user's question after using the necessary tools.

Answer succinctly, focus on Lean tactics, and explain reasoning when helpful.
When providing code solutions, ALWAYS try to apply them directly using the 'edit_editor' tool.`;

  const messages: BaseMessage[] = [
    new SystemMessage(systemInstruction),
    ...normalizedMessages.map(toMessage),
  ];

  const steps: ToolCallResult[] = [];

  try {
    let response = await chatModel.invoke(messages);
    messages.push(response);

    let iterations = 0;
    const MAX_ITERATIONS = 5;

    while (
      response.tool_calls &&
      response.tool_calls.length > 0 &&
      iterations < MAX_ITERATIONS
    ) {
      iterations++;

      for (const toolCall of response.tool_calls) {
        write({
          type: "tool_start",
          name: toolCall.name,
          input: toolCall.args,
        });

        const selectedTool =
          toolsByName[toolCall.name as keyof typeof toolsByName];
        if (!selectedTool) {
          messages.push(
            new ToolMessage({
              tool_call_id: toolCall.id!,
              content: "Tool not found",
            }),
          );
          write({
            type: "tool_end",
            name: toolCall.name,
            output: "Tool not found",
          });
          continue;
        }

        const toolResult = await (
          selectedTool.invoke as (input: unknown) => Promise<string>
        )(toolCall.args);

        const output =
          typeof toolResult === "string"
            ? toolResult
            : JSON.stringify(toolResult);

        steps.push({
          name: toolCall.name as ToolCallResult["name"],
          input: toolCall.args,
          output,
        });

        messages.push(
          new ToolMessage({
            tool_call_id: toolCall.id!,
            content: output,
          }),
        );

        write({
          type: "tool_end",
          name: toolCall.name,
          input: toolCall.args,
          output,
        });
      }

      response = await chatModel.invoke(messages);
      messages.push(response);
    }

    const finalContent = getTextContent(response.content);
    if (finalContent) {
      const words = finalContent.split(/(\s+)/);
      for (const word of words) {
        if (word) {
          write({ type: "token", content: word });
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      }
    }

    write({ type: "done", steps });
  } catch (error) {
    console.error("Chat stream error:", error);
    const detail = (() => {
      if (!error || typeof error !== "object") return null;
      if (error instanceof Error) return error.message;
      const asRecord = error as Record<string, unknown>;
      if (typeof asRecord.message === "string") {
        return asRecord.message;
      }
      return null;
    })();
    write({ type: "error", message: detail ?? "Chat model request failed" });
  }

  event.node.res.end();
});
