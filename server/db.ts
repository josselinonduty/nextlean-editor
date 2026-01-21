import Database from "better-sqlite3";
import { join } from "node:path";
import { mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";

const dataDir = join(process.cwd(), ".data");
const dbPath = join(dataDir, "proofs.db");

let db: Database.Database | null = null;

export async function initializeDatabase(): Promise<Database.Database> {
  if (db) return db;

  if (!existsSync(dataDir)) {
    await mkdir(dataDir, { recursive: true });
  }

  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS proofs (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      tags TEXT,
      embedding TEXT,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    )
  `);

  const columns = db.prepare("PRAGMA table_info(proofs)").all() as Array<{
    name: string;
  }>;
  const hasEmbedding = columns.some((column) => column.name === "embedding");
  if (!hasEmbedding) {
    db.exec("ALTER TABLE proofs ADD COLUMN embedding TEXT");
  }

  return db;
}

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error(
      "Database not initialized. Call initializeDatabase() first.",
    );
  }
  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
