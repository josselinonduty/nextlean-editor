import type * as Monaco from "monaco-editor";

export type MonacoStatic = typeof Monaco;

export interface MonacoPosition {
  lineNumber: number;
  column: number;
}

export interface MonacoRange {
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
}

export interface MonacoCursorPositionEvent {
  position: MonacoPosition;
  reason: number;
  secondaryPositions: MonacoPosition[];
  source: string;
}

export interface MonacoContentChangeEvent {
  changes: Array<{
    range: MonacoRange;
    rangeLength: number;
    rangeOffset: number;
    text: string;
  }>;
  eol: string;
  isFlush: boolean;
  isRedoing: boolean;
  isUndoing: boolean;
  versionId: number;
}

export interface MonacoDecoration {
  range: MonacoRange;
  options: {
    isWholeLine?: boolean;
    className?: string;
    inlineClassName?: string;
    after?: {
      content: string;
      inlineClassName?: string;
      inlineClassNameAffectsLetterSpacing?: boolean;
    };
    linesDecorationsClassName?: string;
    overviewRuler?: {
      color: string;
      position: number;
    };
  };
}

export interface MonacoHoverResult {
  contents: Monaco.IMarkdownString[];
  range?: Monaco.IRange;
}

export interface MonacoCompletionItem {
  label: string;
  kind: Monaco.languages.CompletionItemKind;
  insertText: string;
  insertTextRules?: Monaco.languages.CompletionItemInsertTextRule;
  detail?: string;
  documentation?: string | Monaco.IMarkdownString;
  range?: Monaco.IRange | Monaco.languages.CompletionItemRanges;
  sortText?: string;
  filterText?: string;
}

export interface MonacoCompletionList {
  suggestions: MonacoCompletionItem[];
  incomplete?: boolean;
}

export interface MonacoMarker {
  severity: Monaco.MarkerSeverity;
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
  message: string;
}

export interface MonacoEditorOptions {
  value?: string;
  language?: string;
  theme?: string;
  fontSize?: number;
  wordWrap?: "on" | "off" | "bounded" | "wordWrapColumn";
  minimap?: { enabled: boolean };
  lineNumbers?: "on" | "off" | "relative" | "interval";
  scrollBeyondLastLine?: boolean;
  renderWhitespace?: "none" | "boundary" | "selection" | "all";
  tabSize?: number;
  insertSpaces?: boolean;
  automaticLayout?: boolean;
  hover?: {
    enabled: boolean;
    delay?: number;
    sticky?: boolean;
  };
  quickSuggestions?: boolean;
}

export interface MonacoEditorUpdateOptions {
  fontSize?: number;
  wordWrap?: "on" | "off";
  minimap?: { enabled: boolean };
  lineNumbers?: "on" | "off" | "relative" | "interval";
}
