import type Database from "better-sqlite3";
import type { SavedProof } from "#shared/types";
import { deserializeTags } from "#shared/utils/tags";

export interface ProofRow {
  id: string;
  title: string;
  content: string;
  tags: string | null;
  createdAt: number;
  updatedAt: number;
}

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
