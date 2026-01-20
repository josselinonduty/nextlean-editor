import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createMockResponse } from "../../setup";

const createMockProof = (overrides = {}) => ({
  id: "test-id-1",
  title: "Test Proof",
  content: "theorem test : 1 = 1 := rfl",
  tags: ["test"],
  createdAt: 1000,
  updatedAt: 1000,
  ...overrides,
});

describe("useProofs", () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    vi.resetModules();
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  const loadUseProofs = async () => {
    const mod = await import("~/composables/useProofs");
    return mod.useProofs;
  };

  describe("fetchProofs", () => {
    it("should fetch and store proofs", async () => {
      const mockProofs = [createMockProof()];

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce(createMockResponse(mockProofs));

      const useProofs = await loadUseProofs();
      const { proofs, fetchProofs, loading, error } = useProofs();

      expect(loading.value).toBe(false);

      await fetchProofs();

      expect(proofs.value).toEqual(mockProofs);
      expect(error.value).toBeNull();
      expect(loading.value).toBe(false);
    });

    it("should handle fetch errors", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce(
        createMockResponse(null, {
          ok: false,
          status: 500,
          statusText: "Server Error",
        }),
      );

      const useProofs = await loadUseProofs();
      const { proofs, fetchProofs, error } = useProofs();

      await fetchProofs();

      expect(proofs.value).toEqual([]);
      expect(error.value).toContain("Failed to fetch");
    });

    it("should handle network errors", async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new Error("Network error"));

      const useProofs = await loadUseProofs();
      const { proofs, fetchProofs, error } = useProofs();

      await fetchProofs();

      expect(proofs.value).toEqual([]);
      expect(error.value).toBe("Network error");
    });

    it("should handle empty response", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce(createMockResponse([]));

      const useProofs = await loadUseProofs();
      const { proofs, fetchProofs } = useProofs();

      await fetchProofs();

      expect(proofs.value).toEqual([]);
    });
  });

  describe("getProof", () => {
    it("should get a single proof by id", async () => {
      const mockProof = createMockProof();

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce(createMockResponse(mockProof));

      const useProofs = await loadUseProofs();
      const { getProof, error } = useProofs();

      const result = await getProof("test-id-1");

      expect(result).toEqual(mockProof);
      expect(error.value).toBeNull();
      expect(global.fetch).toHaveBeenCalledWith("/api/proofs/test-id-1", {
        method: "GET",
      });
    });

    it("should return null for 404 response", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce(
        createMockResponse(null, {
          ok: false,
          status: 404,
          statusText: "Not Found",
        }),
      );

      const useProofs = await loadUseProofs();
      const { getProof, error } = useProofs();

      const result = await getProof("nonexistent");

      expect(result).toBeNull();
      expect(error.value).toBeNull();
    });

    it("should handle other errors", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce(
        createMockResponse(null, {
          ok: false,
          status: 500,
          statusText: "Server Error",
        }),
      );

      const useProofs = await loadUseProofs();
      const { getProof, error } = useProofs();

      const result = await getProof("some-id");

      expect(result).toBeNull();
      expect(error.value).toContain("Failed to fetch proof");
    });
  });

  describe("createProof", () => {
    it("should create and add proof to list", async () => {
      const newProof = createMockProof({ id: "new-id", title: "New Proof" });

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce(createMockResponse(newProof));

      const useProofs = await loadUseProofs();
      const { proofs, createProof } = useProofs();

      const result = await createProof({
        title: "New Proof",
        content: "code",
        tags: ["new"],
      });

      expect(result).toEqual(newProof);
      expect(proofs.value).toContainEqual(newProof);
    });

    it("should normalize tags when creating", async () => {
      const newProof = createMockProof();

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce(createMockResponse(newProof));

      const useProofs = await loadUseProofs();
      const { createProof } = useProofs();

      await createProof({
        title: "Test",
        content: "code",
        tags: ["  tag1  ", "tag2", "  ", "tag1"],
      });

      expect(global.fetch).toHaveBeenCalledWith("/api/proofs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.stringContaining('"tags":["tag1","tag2"]'),
      });
    });

    it("should handle creation errors", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce(
        createMockResponse(null, {
          ok: false,
          status: 400,
          statusText: "Bad Request",
        }),
      );

      const useProofs = await loadUseProofs();
      const { createProof, error } = useProofs();

      const result = await createProof({ title: "", content: "code" });

      expect(result).toBeNull();
      expect(error.value).toContain("Failed to create proof");
    });
  });

  describe("updateProof", () => {
    it("should update proof and move to front of list", async () => {
      const existingProof = createMockProof();
      const updatedProof = { ...existingProof, title: "Updated Title" };

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce(createMockResponse([existingProof]))
        .mockResolvedValueOnce(createMockResponse(updatedProof));

      const useProofs = await loadUseProofs();
      const { proofs, fetchProofs, updateProof } = useProofs();

      await fetchProofs();
      const result = await updateProof("test-id-1", { title: "Updated Title" });

      expect(result).toEqual(updatedProof);
      expect(proofs.value[0]).toEqual(updatedProof);
    });

    it("should handle update errors", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce(
        createMockResponse(null, {
          ok: false,
          status: 404,
          statusText: "Not Found",
        }),
      );

      const useProofs = await loadUseProofs();
      const { updateProof, error } = useProofs();

      const result = await updateProof("nonexistent", { title: "New" });

      expect(result).toBeNull();
      expect(error.value).toContain("Failed to update proof");
    });
  });

  describe("deleteProof", () => {
    it("should delete proof and remove from list", async () => {
      const proof1 = createMockProof({ id: "id-1" });
      const proof2 = createMockProof({ id: "id-2" });

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce(createMockResponse([proof1, proof2]))
        .mockResolvedValueOnce(createMockResponse({ success: true }));

      const useProofs = await loadUseProofs();
      const { proofs, fetchProofs, deleteProof } = useProofs();

      await fetchProofs();
      expect(proofs.value).toHaveLength(2);

      const result = await deleteProof("id-1");

      expect(result).toBe(true);
      expect(proofs.value).toHaveLength(1);
      expect(proofs.value.find((p) => p.id === "id-1")).toBeUndefined();
    });

    it("should handle delete errors", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce(
        createMockResponse(null, {
          ok: false,
          status: 404,
          statusText: "Not Found",
        }),
      );

      const useProofs = await loadUseProofs();
      const { deleteProof, error } = useProofs();

      const result = await deleteProof("nonexistent");

      expect(result).toBe(false);
      expect(error.value).toContain("Failed to delete proof");
    });
  });

  describe("loading state", () => {
    it("should set loading to true during fetch and false after", async () => {
      let resolvePromise: (value: Response) => void;
      const fetchPromise = new Promise<Response>((resolve) => {
        resolvePromise = resolve;
      });

      global.fetch = vi.fn().mockReturnValue(fetchPromise);

      const useProofs = await loadUseProofs();
      const { loading, fetchProofs } = useProofs();

      const fetchPromiseResult = fetchProofs();
      expect(loading.value).toBe(true);

      resolvePromise!(createMockResponse([]));
      await fetchPromiseResult;

      expect(loading.value).toBe(false);
    });
  });
});
