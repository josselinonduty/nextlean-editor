import type { Range } from "./lsp";

export interface LeanGoal {
  goals: string[];
  hyps?: LeanHypothesis[];
}

export interface LeanHypothesis {
  names: string[];
  type: string;
  isInstance?: boolean;
}

export interface LeanPlainGoal {
  rendered: string;
  goals: string[];
}

export interface LeanHoverContents {
  value: string;
  kind?: string;
}

export interface LeanHoverResult {
  contents: string | LeanHoverContents | Array<string | LeanHoverContents>;
  range?: Range;
}

export interface LeanCompletionItem {
  label: string;
  kind?: number;
  detail?: string;
  documentation?: string | { value: string; kind?: string };
  insertText?: string;
  insertTextFormat?: number;
  sortText?: string;
  filterText?: string;
}

export interface LeanCompletionResult {
  isIncomplete: boolean;
  items: LeanCompletionItem[];
}

export interface LeanDefinitionResult {
  uri: string;
  range: Range;
}

export type LeanDefinitionResponse =
  | LeanDefinitionResult
  | LeanDefinitionResult[]
  | null;

export interface LeanServerReadyParams {
  rootUri?: string;
}

export interface LeanServerStatusParams {
  message: string;
  type: "info" | "error" | "success";
}

export interface ConsoleMessage {
  message: string;
  type: "info" | "error" | "success";
  timestamp: number;
}
