export interface CursorPosition {
  line: number;
  column: number;
}

export interface EditorDocument {
  uri: string;
  version: number;
  fileName: string;
  content: string;
  isModified: boolean;
  isOpen: boolean;
  cursorPosition: CursorPosition;
}

export interface UseEditorStateReturn {
  document: Readonly<Ref<EditorDocument>>;
  code: ComputedRef<string>;
  updateContent: (content: string) => void;
  updateCursor: (line: number, column: number) => void;
  setFileName: (name: string) => void;
  markSaved: () => void;
  markModified: () => void;
  incrementVersion: () => void;
  setDocumentOpen: (isOpen: boolean) => void;
  reset: () => void;
}

const createDefaultDocument = (): EditorDocument => ({
  uri: "file:///workspace/main.lean",
  version: 1,
  fileName: "main.lean",
  content: "",
  isModified: false,
  isOpen: false,
  cursorPosition: { line: 1, column: 1 },
});

export const useEditorState = (): UseEditorStateReturn => {
  const document = useState<EditorDocument>(
    "editor-document",
    createDefaultDocument,
  );

  const code = computed(() => document.value.content);

  const updateContent = (content: string): void => {
    document.value.content = content;
    document.value.isModified = true;
    document.value.version++;
  };

  const updateCursor = (line: number, column: number): void => {
    document.value.cursorPosition = { line, column };
  };

  const setFileName = (name: string): void => {
    document.value.fileName = name;
    document.value.uri = `file:///workspace/${name}`;
  };

  const markSaved = (): void => {
    document.value.isModified = false;
  };

  const markModified = (): void => {
    document.value.isModified = true;
  };

  const incrementVersion = (): void => {
    document.value.version++;
  };

  const setDocumentOpen = (isOpen: boolean): void => {
    document.value.isOpen = isOpen;
  };

  const reset = (): void => {
    document.value = createDefaultDocument();
  };

  return {
    document: readonly(document),
    code,
    updateContent,
    updateCursor,
    setFileName,
    markSaved,
    markModified,
    incrementVersion,
    setDocumentOpen,
    reset,
  };
};
