export interface UseEditorStateReturn {
  code: Ref<string>;
  updateCode: (newCode: string) => void;
}

export const useEditorState = (): UseEditorStateReturn => {
  const code = useState<string>("editor-code", () => ``);

  const updateCode = (newCode: string): void => {
    code.value = newCode;
  };

  return {
    code,
    updateCode,
  };
};
