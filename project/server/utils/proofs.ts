import Database from "better-sqlite3";
import type { SavedProof } from "#shared/types";

export interface ProofRow {
  id: string;
  title: string;
  content: string;
  tags: string | null;
  embedding: string | null;
  createdAt: number;
  updatedAt: number;
}

export const deserializeTags = (raw: string | null): string[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .map((tag) => String(tag).trim())
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
        input.map((tag) => String(tag).trim()).filter((tag) => tag.length > 0)
      )
    );
  }
  if (typeof input === "string") {
    try {
      const parsed = JSON.parse(input);
      if (Array.isArray(parsed)) {
        return Array.from(
          new Set(
            parsed
              .map((tag) => String(tag).trim())
              .filter((tag) => tag.length > 0)
          )
        );
      }
    } catch {}
    return Array.from(
      new Set(
        input
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0)
      )
    );
  }
  return [];
};

export const mapProofRow = (row: ProofRow): SavedProof => ({
  id: row.id,
  title: row.title,
  content: row.content,
  tags: deserializeTags(row.tags),
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

export const parseEmbedding = (raw: string | null): number[] | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const vector = parsed.map((value) => Number(value));
    if (vector.length === 0) return null;
    if (vector.every((value) => Number.isFinite(value))) {
      return vector;
    }
  } catch {}
  return null;
};

export interface ProofEmbeddingEntry {
  id: string;
  title: string;
  content: string;
  tags: string[];
  embedding: number[];
  updatedAt: number;
}

export const loadProofEmbeddings = (
  db: Database.Database
): ProofEmbeddingEntry[] => {
  const rows = db
    .prepare("SELECT * FROM proofs WHERE embedding IS NOT NULL")
    .all() as ProofRow[];
  const entries: ProofEmbeddingEntry[] = [];
  for (const row of rows) {
    const vector = parseEmbedding(row.embedding);
    if (!vector) continue;
    entries.push({
      id: row.id,
      title: row.title,
      content: row.content,
      tags: deserializeTags(row.tags),
      embedding: vector,
      updatedAt: row.updatedAt,
    });
  }
  return entries;
};

export const findProofById = (
  db: Database.Database,
  id: string
): ProofRow | undefined => {
  return db.prepare("SELECT * FROM proofs WHERE id = ?").get(id) as
    | ProofRow
    | undefined;
};
