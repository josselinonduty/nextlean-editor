import type Database from "better-sqlite3";
import type { SavedProof } from "#shared/types";

export interface ProofRow {
  id: string;
  title: string;
  content: string;
  tags: string | null;
  createdAt: number;
  updatedAt: number;
}

export const deserializeTags = (raw: string | null): string[] => {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .map((tag: unknown) => String(tag).trim())
        .filter((tag) => tag.length > 0);
    }
  } catch {}
  return raw
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
};

export const serializeTags = (tags: string[]): string => {
  return tags.length > 0 ? JSON.stringify(tags) : "[]";
};

export const normalizeIncomingTags = (input: unknown): string[] => {
  if (input === null || input === undefined) return [];
  if (Array.isArray(input)) {
    return Array.from(
      new Set(
        input
          .map((tag: unknown) => String(tag).trim())
          .filter((tag) => tag.length > 0),
      ),
    );
  }
  if (typeof input === "string") {
    try {
      const parsed: unknown = JSON.parse(input);
      if (Array.isArray(parsed)) {
        return Array.from(
          new Set(
            parsed
              .map((tag: unknown) => String(tag).trim())
              .filter((tag) => tag.length > 0),
          ),
        );
      }
    } catch {}
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

export const mapProofRow = (
  row:
    | ProofRow
    | {
        id: string;
        title: string;
        content: string;
        tags: string | null;
        createdAt: number;
        updatedAt: number;
      },
): SavedProof => ({
  id: row.id,
  title: row.title,
  content: row.content,
  tags: deserializeTags(row.tags),
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

export const findProofById = (
  db: Database.Database,
  id: string,
): ProofRow | undefined => {
  return db.prepare("SELECT * FROM proofs WHERE id = ?").get(id) as
    | ProofRow
    | undefined;
};
