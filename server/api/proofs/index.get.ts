import { initializeDatabase } from "#server/db";
import { mapProofRow, type ProofRow } from "#server/utils/proofs";

export default defineEventHandler(async () => {
  const db = await initializeDatabase();
  const rows = db
    .prepare("SELECT * FROM proofs ORDER BY updatedAt DESC")
    .all() as ProofRow[];
  return rows.map(mapProofRow);
});
