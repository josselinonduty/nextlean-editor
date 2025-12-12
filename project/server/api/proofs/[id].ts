import type { H3Event } from "h3";
import { initializeDatabase } from "#server/db";
import {
  findProofById,
  mapProofRow,
  normalizeIncomingTags,
  serializeTags,
  type ProofRow,
} from "#server/utils/proofs";

type ProofsDatabase = Awaited<ReturnType<typeof initializeDatabase>>;

const handleGet = (db: ProofsDatabase, id: string) => {
  const row = findProofById(db, id);
  if (!row) {
    throw createError({
      statusCode: 404,
      statusMessage: "Proof not found",
    });
  }
  return mapProofRow(row);
};

const handlePut = async (event: H3Event, db: ProofsDatabase, id: string) => {
  const body = await readBody(event);
  const existing = findProofById(db, id);
  if (!existing) {
    throw createError({
      statusCode: 404,
      statusMessage: "Proof not found",
    });
  }

  const now = Date.now();
  const title =
    typeof body.title === "string" && body.title.trim().length > 0
      ? body.title.trim()
      : existing.title;
  const content =
    typeof body.content === "string" && body.content.length > 0
      ? body.content
      : existing.content;
  let tagsValue = existing.tags ?? "[]";
  if (body.tags !== undefined) {
    const normalizedTags = normalizeIncomingTags(body.tags);
    tagsValue = serializeTags(normalizedTags);
  }

  db.prepare(
    "UPDATE proofs SET title = ?, content = ?, tags = ?, updatedAt = ? WHERE id = ?"
  ).run(title, content, tagsValue, now, id);

  const updated = findProofById(db, id) as ProofRow | undefined;
  if (!updated) {
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to load updated proof",
    });
  }
  return mapProofRow(updated);
};

const handleDelete = (db: ProofsDatabase, id: string) => {
  const result = db.prepare("DELETE FROM proofs WHERE id = ?").run(id);
  if (result.changes === 0) {
    throw createError({
      statusCode: 404,
      statusMessage: "Proof not found",
    });
  }
  return { success: true };
};

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "ID is required",
    });
  }

  const db = await initializeDatabase();

  switch (event.method) {
    case "GET":
      return handleGet(db, id);
    case "PUT":
      return handlePut(event, db, id);
    case "DELETE":
      return handleDelete(db, id);
    default:
      throw createError({
        statusCode: 405,
        statusMessage: "Method not allowed",
      });
  }
});
