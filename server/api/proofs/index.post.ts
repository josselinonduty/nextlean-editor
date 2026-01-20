import { initializeDatabase } from "#server/db";
import { ProofsService } from "#server/services/proofs.service";

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

  const db = await initializeDatabase();
  const service = new ProofsService(db);

  try {
    return service.create({
      title: body.title,
      content: body.content,
      tags: body.tags,
    });
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage:
        error instanceof Error ? error.message : "Failed to create proof",
    });
  }
});
