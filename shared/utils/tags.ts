export const normalizeTags = (input: unknown): string[] => {
  if (input === null || input === undefined) return [];

  if (Array.isArray(input)) {
    return Array.from(
      new Set(
        input.map((tag) => String(tag).trim()).filter((tag) => tag.length > 0),
      ),
    );
  }

  if (typeof input === "string") {
    try {
      const parsed = JSON.parse(input);
      if (Array.isArray(parsed)) {
        return normalizeTags(parsed);
      }
    } catch {
      // Fallback to comma split
    }

    return Array.from(
      new Set(
        input
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0),
      ),
    );
  }

  return [];
};

export const serializeTags = (tags: string[]): string => {
  return JSON.stringify(tags);
};

export const deserializeTags = (raw: string | null): string[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return normalizeTags(parsed);
    }
  } catch {
    // Fallback to comma split
  }
  return normalizeTags(raw);
};
