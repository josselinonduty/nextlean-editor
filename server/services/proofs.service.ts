import type Database from "better-sqlite3";
import type {
  SavedProof,
  CreateProofRequest,
  UpdateProofRequest,
} from "#shared/types";
import { mapProofRow, findProofById } from "#server/utils/proofs";
import { serializeTags, normalizeTags } from "#shared/utils/tags";
import {
  safeValidateProofRow,
  safeValidateProofRows,
} from "#server/schemas/proof.schema";
import { randomUUID } from "node:crypto";

export class ProofsService {
  constructor(private readonly db: Database.Database) {}

  getAll(): SavedProof[] {
    const rows = this.db
      .prepare("SELECT * FROM proofs ORDER BY updatedAt DESC")
      .all();

    const validation = safeValidateProofRows(rows);
    if (!validation.success) {
      throw new Error("Database returned invalid data");
    }

    return validation.data.map(mapProofRow);
  }

  getById(id: string): SavedProof | null {
    const row = findProofById(this.db, id);
    return row ? mapProofRow(row) : null;
  }

  create(data: CreateProofRequest): SavedProof {
    if (!data.title || data.title.trim().length === 0) {
      throw new Error("Title is required");
    }
    if (!data.content || data.content.length === 0) {
      throw new Error("Content is required");
    }

    const now = Date.now();
    const id = randomUUID();
    const title = data.title.trim();
    const content = data.content;
    const tagsValue = serializeTags(normalizeTags(data.tags));

    this.db
      .prepare(
        "INSERT INTO proofs (id, title, content, tags, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .run(id, title, content, tagsValue, now, now);

    const created = this.db
      .prepare("SELECT * FROM proofs WHERE id = ?")
      .get(id);
    const validation = safeValidateProofRow(created);
    if (!validation.success) {
      throw new Error("Failed to load created proof");
    }

    return mapProofRow(validation.data);
  }

  update(id: string, data: UpdateProofRequest): SavedProof | null {
    const existing = findProofById(this.db, id);
    if (!existing) return null;

    const now = Date.now();
    const title =
      typeof data.title === "string" && data.title.trim().length > 0
        ? data.title.trim()
        : existing.title;
    const content =
      typeof data.content === "string" && data.content.length > 0
        ? data.content
        : existing.content;
    let tagsValue = existing.tags ?? "[]";
    if (data.tags !== undefined) {
      tagsValue = serializeTags(normalizeTags(data.tags));
    }

    this.db
      .prepare(
        "UPDATE proofs SET title = ?, content = ?, tags = ?, updatedAt = ? WHERE id = ?",
      )
      .run(title, content, tagsValue, now, id);

    const updated = this.db
      .prepare("SELECT * FROM proofs WHERE id = ?")
      .get(id);
    const validation = safeValidateProofRow(updated);
    if (!validation.success) {
      throw new Error("Failed to load updated proof");
    }

    return mapProofRow(validation.data);
  }

  delete(id: string): boolean {
    const result = this.db.prepare("DELETE FROM proofs WHERE id = ?").run(id);
    return result.changes > 0;
  }
}
