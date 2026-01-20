import type {
  DidOpenTextDocumentParams,
  DidChangeTextDocumentParams,
  DidCloseTextDocumentParams,
  TextDocumentContentChangeEvent,
  PublishDiagnosticsParams,
} from "#shared/types/lsp";
import type { JsonRpcMessage } from "#shared/types/jsonrpc";
import type {
  LeanHoverResult,
  LeanCompletionResult,
  LeanDefinitionResponse,
  LeanPlainGoal,
} from "#shared/types/lean";
import { useLeanServer, type UseLeanServerReturn } from "./useLeanServer";

export interface UseLeanLspReturn extends UseLeanServerReturn {
  diagnostics: Ref<PublishDiagnosticsParams[]>;
  setupDiagnosticsListener: () => () => void;
  openTextDocument: (
    uri: string,
    languageId: string,
    version: number,
    text: string,
  ) => void;
  changeTextDocument: (
    uri: string,
    version: number,
    changes: TextDocumentContentChangeEvent[],
  ) => void;
  closeTextDocument: (uri: string) => void;
  getHover: (
    uri: string,
    line: number,
    character: number,
  ) => Promise<LeanHoverResult | null>;
  getCompletion: (
    uri: string,
    line: number,
    character: number,
  ) => Promise<LeanCompletionResult | null>;
  getDefinition: (
    uri: string,
    line: number,
    character: number,
  ) => Promise<LeanDefinitionResponse>;
  getGoalState: (
    uri: string,
    line: number,
    character: number,
  ) => Promise<LeanPlainGoal | null>;
  clearDiagnosticsForUri: (uri: string) => void;
}

export function useLeanLsp(): UseLeanLspReturn {
  const leanServer = useLeanServer();
  const diagnostics = useState<PublishDiagnosticsParams[]>(
    "lean-diagnostics",
    () => [],
  );

  function setupDiagnosticsListener(): () => void {
    return leanServer.onMessage((message: JsonRpcMessage) => {
      if (
        "method" in message &&
        message.method === "textDocument/publishDiagnostics"
      ) {
        const params = message.params as PublishDiagnosticsParams;
        const existingIndex = diagnostics.value.findIndex(
          (d) => d.uri === params.uri,
        );
        if (existingIndex >= 0) {
          diagnostics.value[existingIndex] = params;
        } else {
          if (diagnostics.value.length >= 100) {
            diagnostics.value.shift();
          }
          diagnostics.value.push(params);
        }
      }
    });
  }

  function clearDiagnosticsForUri(uri: string): void {
    diagnostics.value = diagnostics.value.filter((d) => d.uri !== uri);
  }

  function openTextDocument(
    uri: string,
    languageId: string,
    version: number,
    text: string,
  ): void {
    const params: DidOpenTextDocumentParams = {
      textDocument: {
        uri,
        languageId,
        version,
        text,
      },
    };

    leanServer.sendNotification("textDocument/didOpen", params);
  }

  function changeTextDocument(
    uri: string,
    version: number,
    changes: TextDocumentContentChangeEvent[],
  ): void {
    const params: DidChangeTextDocumentParams = {
      textDocument: {
        uri,
        version,
      },
      contentChanges: changes,
    };

    leanServer.sendNotification("textDocument/didChange", params);
  }

  function closeTextDocument(uri: string): void {
    clearDiagnosticsForUri(uri);

    const params: DidCloseTextDocumentParams = {
      textDocument: { uri },
    };

    leanServer.sendNotification("textDocument/didClose", params);
  }

  async function getHover(
    uri: string,
    line: number,
    character: number,
  ): Promise<LeanHoverResult | null> {
    return await leanServer.sendRequest<LeanHoverResult | null>(
      "textDocument/hover",
      {
        textDocument: { uri },
        position: { line, character },
      },
    );
  }

  async function getCompletion(
    uri: string,
    line: number,
    character: number,
  ): Promise<LeanCompletionResult | null> {
    return await leanServer.sendRequest<LeanCompletionResult | null>(
      "textDocument/completion",
      {
        textDocument: { uri },
        position: { line, character },
      },
    );
  }

  async function getDefinition(
    uri: string,
    line: number,
    character: number,
  ): Promise<LeanDefinitionResponse> {
    return await leanServer.sendRequest<LeanDefinitionResponse>(
      "textDocument/definition",
      {
        textDocument: { uri },
        position: { line, character },
      },
    );
  }

  async function getGoalState(
    uri: string,
    line: number,
    character: number,
  ): Promise<LeanPlainGoal | null> {
    return await leanServer.sendRequest<LeanPlainGoal | null>(
      "$/lean/plainGoal",
      {
        textDocument: { uri },
        position: { line, character },
      },
    );
  }

  return {
    ...leanServer,
    diagnostics,
    setupDiagnosticsListener,
    openTextDocument,
    changeTextDocument,
    closeTextDocument,
    getHover,
    getCompletion,
    getDefinition,
    getGoalState,
    clearDiagnosticsForUri,
  };
}
