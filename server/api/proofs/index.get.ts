import { initializeDatabase } from "#server/db";
import { ProofsService } from "#server/services/proofs.service";

export default defineEventHandler(async () => {
  const db = await initializeDatabase();
  const service = new ProofsService(db);

  try {
    return service.getAll();
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage:
        error instanceof Error
          ? error.message
          : "Database returned invalid data",
    });
  }
});
