import { initializeDatabase } from "#server/db";
import { mapProofRow } from "#server/utils/proofs";
import { safeValidateProofRows } from "#server/schemas/proof.schema";

export default defineEventHandler(async () => {
  const db = await initializeDatabase();
  const rows = db.prepare("SELECT * FROM proofs ORDER BY updatedAt DESC").all();

  const validation = safeValidateProofRows(rows);
  if (!validation.success) {
    console.error("Database validation failed:", validation.error.message);
    throw createError({
      statusCode: 500,
      statusMessage: "Database returned invalid data",
    });
  }

  return validation.data.map(mapProofRow);
});
