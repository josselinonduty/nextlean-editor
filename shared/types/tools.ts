export interface ListProofsInput {
  query: string;
}

export interface GetProofInput {
  id: string;
}

export interface ReadEditorInput {
  startLine?: number;
  endLine?: number;
}

export interface EditEditorInput {
  startLine: number;
  endLine: number;
  newContent: string;
}

export interface EditPreview {
  startLine: number;
  endLine: number;
  oldContent: string;
  newContent: string;
}

export interface AddDependencyInput {
  name: string;
  url: string;
}

export type GetDiagnosticsInput = Record<string, never>;

export type ToolName =
  | "list_proofs"
  | "get_proof"
  | "read_editor"
  | "edit_editor"
  | "add_dependency"
  | "get_diagnostics";

export type ToolInput =
  | { name: "list_proofs"; input: ListProofsInput }
  | { name: "get_proof"; input: GetProofInput }
  | { name: "read_editor"; input: ReadEditorInput }
  | { name: "edit_editor"; input: EditEditorInput }
  | { name: "add_dependency"; input: AddDependencyInput }
  | { name: "get_diagnostics"; input: GetDiagnosticsInput };

export interface ToolCallResult {
  name: ToolName;
  input: unknown;
  output: string;
}
