import type {
  SavedProof,
  CreateProofRequest,
  UpdateProofRequest,
} from "#shared/types";

const normalizeTags = (tags?: string[]): string[] => {
  if (!tags) return [];
  const unique = new Set<string>();
  for (const tag of tags) {
    const value = String(tag).trim();
    if (value) unique.add(value);
  }
  return Array.from(unique);
};

const parseJSON = async <T>(response: Response): Promise<T | null> => {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Failed to parse server response");
  }
};

export interface UseProofsReturn {
  proofs: Readonly<Ref<SavedProof[]>>;
  loading: Readonly<Ref<boolean>>;
  error: Readonly<Ref<string | null>>;
  fetchProofs: () => Promise<void>;
  getProof: (id: string) => Promise<SavedProof | null>;
  createProof: (data: CreateProofRequest) => Promise<SavedProof | null>;
  updateProof: (
    id: string,
    data: UpdateProofRequest,
  ) => Promise<SavedProof | null>;
  deleteProof: (id: string) => Promise<boolean>;
}

export const useProofs = (): UseProofsReturn => {
  const proofs = ref<SavedProof[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const fetchProofs = async (): Promise<void> => {
    loading.value = true;
    error.value = null;
    try {
      const response = await fetch("/api/proofs", { method: "GET" });
      if (!response.ok) {
        throw new Error(`Failed to fetch proofs: ${response.statusText}`);
      }
      const data = await parseJSON<SavedProof[]>(response);
      proofs.value = Array.isArray(data) ? data : [];
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Unknown error";
      proofs.value = [];
    } finally {
      loading.value = false;
    }
  };

  const getProof = async (id: string): Promise<SavedProof | null> => {
    loading.value = true;
    error.value = null;
    try {
      const response = await fetch(`/api/proofs/${id}`, { method: "GET" });
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`Failed to fetch proof: ${response.statusText}`);
      }
      return await parseJSON<SavedProof>(response);
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Unknown error";
      return null;
    } finally {
      loading.value = false;
    }
  };

  const createProof = async (
    data: CreateProofRequest,
  ): Promise<SavedProof | null> => {
    loading.value = true;
    error.value = null;
    try {
      const payload: CreateProofRequest = {
        title: data.title,
        content: data.content,
        tags: normalizeTags(data.tags),
      };
      const response = await fetch("/api/proofs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(`Failed to create proof: ${response.statusText}`);
      }
      const created = await parseJSON<SavedProof>(response);
      if (created) {
        proofs.value = [
          created,
          ...proofs.value.filter((p) => p.id !== created.id),
        ];
      }
      return created;
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Unknown error";
      return null;
    } finally {
      loading.value = false;
    }
  };

  const updateProof = async (
    id: string,
    data: UpdateProofRequest,
  ): Promise<SavedProof | null> => {
    loading.value = true;
    error.value = null;
    try {
      const payload: UpdateProofRequest = { ...data };
      if (data.tags !== undefined) {
        payload.tags = normalizeTags(data.tags);
      }
      const response = await fetch(`/api/proofs/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(`Failed to update proof: ${response.statusText}`);
      }
      const updated = await parseJSON<SavedProof>(response);
      if (updated) {
        proofs.value = [updated, ...proofs.value.filter((p) => p.id !== id)];
      }
      return updated;
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Unknown error";
      return null;
    } finally {
      loading.value = false;
    }
  };

  const deleteProof = async (id: string): Promise<boolean> => {
    loading.value = true;
    error.value = null;
    try {
      const response = await fetch(`/api/proofs/${id}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error(`Failed to delete proof: ${response.statusText}`);
      }
      proofs.value = proofs.value.filter((p) => p.id !== id);
      return true;
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Unknown error";
      return false;
    } finally {
      loading.value = false;
    }
  };

  return {
    proofs: readonly(proofs),
    loading: readonly(loading),
    error: readonly(error),
    fetchProofs,
    getProof,
    createProof,
    updateProof,
    deleteProof,
  };
};
