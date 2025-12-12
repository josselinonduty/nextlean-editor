import { randomUUID } from "node:crypto";
import { initializeDatabase } from "#server/db";
import {
  mapProofRow,
  normalizeIncomingTags,
  serializeTags,
  type ProofRow,
} from "#server/utils/proofs";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  if (
    !body ||
    typeof body.title !== "string" ||
    body.title.trim().length === 0
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: "Title is required",
    });
  }

  if (!body || typeof body.content !== "string" || body.content.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "Content is required",
    });
  }

  const content = body.content;

  const db = await initializeDatabase();
  const now = Date.now();
  const id = randomUUID();
  const title = body.title.trim();
  const normalizedTags = normalizeIncomingTags(body.tags);
  const tagsValue = serializeTags(normalizedTags);

  db.prepare(
    "INSERT INTO proofs (id, title, content, tags, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, title, content, tagsValue, now, now);

  const created = db.prepare("SELECT * FROM proofs WHERE id = ?").get(id) as
    | ProofRow
    | undefined;
  if (!created) {
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to load created proof",
    });
  }

  return mapProofRow(created);
});
