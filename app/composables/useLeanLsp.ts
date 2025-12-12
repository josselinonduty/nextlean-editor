import type {
  DidOpenTextDocumentParams,
  DidChangeTextDocumentParams,
  DidCloseTextDocumentParams,
  TextDocumentContentChangeEvent,
  PublishDiagnosticsParams,
} from "#shared/types/lsp";
import type { JsonRpcMessage } from "#shared/types/jsonrpc";
import { useLeanServer } from "./useLeanServer";

export function useLeanLsp() {
  const leanServer = useLeanServer();
  const diagnostics = useState<PublishDiagnosticsParams[]>(
    "lean-diagnostics",
    () => []
  );

  function setupDiagnosticsListener() {
    return leanServer.onMessage((message: JsonRpcMessage) => {
      if (
        "method" in message &&
        message.method === "textDocument/publishDiagnostics"
      ) {
        const params = message.params as PublishDiagnosticsParams;
        diagnostics.value.push(params);
      }
    });
  }

  async function openTextDocument(
    uri: string,
    languageId: string,
    version: number,
    text: string
  ) {
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

  async function changeTextDocument(
    uri: string,
    version: number,
    changes: TextDocumentContentChangeEvent[]
  ) {
    const params: DidChangeTextDocumentParams = {
      textDocument: {
        uri,
        version,
      },
      contentChanges: changes,
    };

    leanServer.sendNotification("textDocument/didChange", params);
  }

  async function closeTextDocument(uri: string) {
    const params: DidCloseTextDocumentParams = {
      textDocument: { uri },
    };

    leanServer.sendNotification("textDocument/didClose", params);
  }

  async function getHover(uri: string, line: number, character: number) {
    return await leanServer.sendRequest("textDocument/hover", {
      textDocument: { uri },
      position: { line, character },
    });
  }

  async function getCompletion(uri: string, line: number, character: number) {
    return await leanServer.sendRequest("textDocument/completion", {
      textDocument: { uri },
      position: { line, character },
    });
  }

  async function getDefinition(uri: string, line: number, character: number) {
    return await leanServer.sendRequest("textDocument/definition", {
      textDocument: { uri },
      position: { line, character },
    });
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
  };
}
