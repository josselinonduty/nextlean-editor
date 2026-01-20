import type { H3Event } from "h3";
import type { SavedProof } from "#shared/types";
import { initializeDatabase } from "#server/db";
import { ProofsService } from "#server/services/proofs.service";

type ProofsDatabase = Awaited<ReturnType<typeof initializeDatabase>>;

const handleGet = (service: ProofsService, id: string): SavedProof => {
  const proof = service.getById(id);
  if (!proof) {
    throw createError({
      statusCode: 404,
      statusMessage: "Proof not found",
    });
  }
  return proof;
};

const handlePut = async (
  event: H3Event,
  service: ProofsService,
  id: string,
): Promise<SavedProof> => {
  const body = await readBody(event);

  try {
    const updated = service.update(id, {
      title: body.title,
      content: body.content,
      tags: body.tags,
    });

    if (!updated) {
      throw createError({
        statusCode: 404,
        statusMessage: "Proof not found",
      });
    }

    return updated;
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode === 404) {
      throw error;
    }
    throw createError({
      statusCode: 500,
      statusMessage:
        error instanceof Error ? error.message : "Failed to update proof",
    });
  }
};

const handleDelete = (
  service: ProofsService,
  id: string,
): { success: boolean } => {
  const deleted = service.delete(id);
  if (!deleted) {
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
  const service = new ProofsService(db);

  switch (event.method) {
    case "GET":
      return handleGet(service, id);
    case "PUT":
      return handlePut(event, service, id);
    case "DELETE":
      return handleDelete(service, id);
    default:
      throw createError({
        statusCode: 405,
        statusMessage: "Method not allowed",
      });
  }
});
