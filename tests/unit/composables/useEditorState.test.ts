import { describe, it, expect, vi, beforeEach } from "vitest";

describe("useEditorState", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  const loadUseEditorState = async () => {
    const mod = await import("~/composables/useEditorState");
    return mod.useEditorState;
  };

  describe("initial state", () => {
    it("should initialize with default document values", async () => {
      const useEditorState = await loadUseEditorState();
      const { document } = useEditorState();

      expect(document.value.uri).toBe("file:///workspace/main.lean");
      expect(document.value.version).toBe(1);
      expect(document.value.fileName).toBe("main.lean");
      expect(document.value.content).toBe("");
      expect(document.value.isModified).toBe(false);
      expect(document.value.isOpen).toBe(false);
      expect(document.value.cursorPosition).toEqual({ line: 1, column: 1 });
    });

    it("should provide computed code property", async () => {
      const useEditorState = await loadUseEditorState();
      const { code, updateContent } = useEditorState();

      expect(code.value).toBe("");

      updateContent("theorem test : 1 = 1 := rfl");
      expect(code.value).toBe("theorem test : 1 = 1 := rfl");
    });
  });

  describe("updateContent", () => {
    it("should update content and mark as modified", async () => {
      const useEditorState = await loadUseEditorState();
      const { document, updateContent } = useEditorState();

      updateContent("new content");

      expect(document.value.content).toBe("new content");
      expect(document.value.isModified).toBe(true);
    });

    it("should increment version on content update", async () => {
      const useEditorState = await loadUseEditorState();
      const { document, updateContent } = useEditorState();

      const initialVersion = document.value.version;
      updateContent("first update");
      expect(document.value.version).toBe(initialVersion + 1);

      updateContent("second update");
      expect(document.value.version).toBe(initialVersion + 2);
    });
  });

  describe("updateCursor", () => {
    it("should update cursor position", async () => {
      const useEditorState = await loadUseEditorState();
      const { document, updateCursor } = useEditorState();

      updateCursor(10, 5);

      expect(document.value.cursorPosition).toEqual({ line: 10, column: 5 });
    });
  });

  describe("setFileName", () => {
    it("should update file name and uri", async () => {
      const useEditorState = await loadUseEditorState();
      const { document, setFileName } = useEditorState();

      setFileName("myproof.lean");

      expect(document.value.fileName).toBe("myproof.lean");
      expect(document.value.uri).toBe("file:///workspace/myproof.lean");
    });
  });

  describe("markSaved", () => {
    it("should set isModified to false", async () => {
      const useEditorState = await loadUseEditorState();
      const { document, updateContent, markSaved } = useEditorState();

      updateContent("some content");
      expect(document.value.isModified).toBe(true);

      markSaved();
      expect(document.value.isModified).toBe(false);
    });
  });

  describe("markModified", () => {
    it("should set isModified to true", async () => {
      const useEditorState = await loadUseEditorState();
      const { document, markModified, markSaved } = useEditorState();

      markSaved();
      expect(document.value.isModified).toBe(false);

      markModified();
      expect(document.value.isModified).toBe(true);
    });
  });

  describe("incrementVersion", () => {
    it("should increment document version", async () => {
      const useEditorState = await loadUseEditorState();
      const { document, incrementVersion } = useEditorState();

      const initialVersion = document.value.version;
      incrementVersion();
      expect(document.value.version).toBe(initialVersion + 1);
    });
  });

  describe("setDocumentOpen", () => {
    it("should set isOpen flag", async () => {
      const useEditorState = await loadUseEditorState();
      const { document, setDocumentOpen } = useEditorState();

      expect(document.value.isOpen).toBe(false);

      setDocumentOpen(true);
      expect(document.value.isOpen).toBe(true);

      setDocumentOpen(false);
      expect(document.value.isOpen).toBe(false);
    });
  });

  describe("reset", () => {
    it("should reset document to default state", async () => {
      const useEditorState = await loadUseEditorState();
      const {
        document,
        updateContent,
        setFileName,
        updateCursor,
        setDocumentOpen,
        reset,
      } = useEditorState();

      updateContent("modified content");
      setFileName("custom.lean");
      updateCursor(50, 20);
      setDocumentOpen(true);

      reset();

      expect(document.value.uri).toBe("file:///workspace/main.lean");
      expect(document.value.version).toBe(1);
      expect(document.value.fileName).toBe("main.lean");
      expect(document.value.content).toBe("");
      expect(document.value.isModified).toBe(false);
      expect(document.value.isOpen).toBe(false);
      expect(document.value.cursorPosition).toEqual({ line: 1, column: 1 });
    });
  });

  describe("registerEditor", () => {
    it("should register editor reference for executeEditorEdit", async () => {
      const useEditorState = await loadUseEditorState();
      const { registerEditor, executeEditorEdit } = useEditorState();

      const mockEditor = {
        getValue: vi.fn().mockReturnValue("updated content"),
        setValue: vi.fn(),
        focus: vi.fn(),
        layout: vi.fn(),
        executeEdit: vi.fn().mockResolvedValue(true),
        getEditPreview: vi.fn().mockReturnValue(null),
      };

      registerEditor(mockEditor);

      const result = await executeEditorEdit({
        startLine: 1,
        endLine: 1,
        newContent: "new",
      });

      expect(result).toBe(true);
      expect(mockEditor.executeEdit).toHaveBeenCalled();
    });
  });

  describe("executeEditorEdit", () => {
    it("should return false when no editor is registered", async () => {
      vi.resetModules();
      const useEditorState = await loadUseEditorState();
      const { executeEditorEdit } = useEditorState();

      const result = await executeEditorEdit({
        startLine: 1,
        endLine: 1,
        newContent: "new",
      });

      expect(result).toBe(false);
    });

    it("should update document state after successful edit", async () => {
      const useEditorState = await loadUseEditorState();
      const { document, registerEditor, executeEditorEdit } = useEditorState();

      const mockEditor = {
        getValue: vi.fn().mockReturnValue("new content from edit"),
        setValue: vi.fn(),
        focus: vi.fn(),
        layout: vi.fn(),
        executeEdit: vi.fn().mockResolvedValue(true),
        getEditPreview: vi.fn().mockReturnValue(null),
      };

      registerEditor(mockEditor);
      const initialVersion = document.value.version;

      await executeEditorEdit({
        startLine: 1,
        endLine: 1,
        newContent: "new",
      });

      expect(document.value.content).toBe("new content from edit");
      expect(document.value.isModified).toBe(true);
      expect(document.value.version).toBe(initialVersion + 1);
    });
  });

  describe("getEditorEditPreview", () => {
    it("should return null when no editor is registered", async () => {
      vi.resetModules();
      const useEditorState = await loadUseEditorState();
      const { getEditorEditPreview } = useEditorState();

      const result = getEditorEditPreview({
        startLine: 1,
        endLine: 1,
        newContent: "new",
      });

      expect(result).toBeNull();
    });

    it("should delegate to editor when registered", async () => {
      const useEditorState = await loadUseEditorState();
      const { registerEditor, getEditorEditPreview } = useEditorState();

      const mockPreview = {
        oldContent: "old",
        newContent: "new",
        startLine: 1,
        endLine: 1,
      };

      const mockEditor = {
        getValue: vi.fn(),
        setValue: vi.fn(),
        focus: vi.fn(),
        layout: vi.fn(),
        executeEdit: vi.fn(),
        getEditPreview: vi.fn().mockReturnValue(mockPreview),
      };

      registerEditor(mockEditor);

      const result = getEditorEditPreview({
        startLine: 1,
        endLine: 1,
        newContent: "new",
      });

      expect(result).toEqual(mockPreview);
    });
  });
});
