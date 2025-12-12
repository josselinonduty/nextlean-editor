export const useEditorState = () => {
  const code = useState<string>("editor-code", () => ``);

  const updateCode = (newCode: string) => {
    code.value = newCode;
  };

  return {
    code,
    updateCode,
  };
};
