import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";

vi.mock("#server/db", () => {
  let mockDb: Database.Database | null = null;

  return {
    initializeDatabase: vi.fn(async () => {
      if (!mockDb) {
        mockDb = new Database(":memory:");
        mockDb.exec(`
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
      }
      return mockDb;
    }),
    getDatabase: vi.fn(() => mockDb),
    closeDatabase: vi.fn(() => {
      if (mockDb) {
        mockDb.close();
        mockDb = null;
      }
    }),
    _resetMockDb: () => {
      if (mockDb) {
        mockDb.close();
        mockDb = null;
      }
    },
  };
});

import {
  deserializeTags,
  serializeTags,
  normalizeIncomingTags,
  mapProofRow,
  findProofById,
  type ProofRow,
} from "#server/utils/proofs";
import { initializeDatabase, closeDatabase } from "#server/db";

const createProofRow = (overrides: Partial<ProofRow> = {}): ProofRow => ({
  id: randomUUID(),
  title: "Test Proof",
  content: "theorem test : 1 = 1 := rfl",
  tags: '["test", "proof"]',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ...overrides,
});

describe("Proofs Server Utilities", () => {
  describe("deserializeTags", () => {
    it("should return empty array for null input", () => {
      expect(deserializeTags(null)).toEqual([]);
    });

    it("should parse valid JSON array", () => {
      expect(deserializeTags('["tag1", "tag2"]')).toEqual(["tag1", "tag2"]);
    });

    it("should fall back to comma split for invalid JSON", () => {
      expect(deserializeTags("tag1, tag2, tag3")).toEqual([
        "tag1",
        "tag2",
        "tag3",
      ]);
    });

    it("should trim whitespace from tags", () => {
      expect(deserializeTags('["  tag1  ", " tag2 "]')).toEqual([
        "tag1",
        "tag2",
      ]);
    });

    it("should filter empty strings", () => {
      expect(deserializeTags('["tag1", "", "tag2"]')).toEqual(["tag1", "tag2"]);
    });

    it("should handle empty JSON array", () => {
      expect(deserializeTags("[]")).toEqual([]);
    });
  });

  describe("serializeTags", () => {
    it("should serialize empty array to empty JSON array", () => {
      expect(serializeTags([])).toBe("[]");
    });

    it("should serialize tags to JSON array", () => {
      expect(serializeTags(["tag1", "tag2"])).toBe('["tag1","tag2"]');
    });

    it("should handle single tag", () => {
      expect(serializeTags(["solo"])).toBe('["solo"]');
    });
  });

  describe("normalizeIncomingTags", () => {
    it("should return empty array for null", () => {
      expect(normalizeIncomingTags(null)).toEqual([]);
    });

    it("should return empty array for undefined", () => {
      expect(normalizeIncomingTags(undefined)).toEqual([]);
    });

    it("should normalize array input", () => {
      expect(normalizeIncomingTags(["tag1", "tag2"])).toEqual(["tag1", "tag2"]);
    });

    it("should deduplicate array input", () => {
      expect(normalizeIncomingTags(["tag1", "tag1", "tag2"])).toEqual([
        "tag1",
        "tag2",
      ]);
    });

    it("should trim and filter array input", () => {
      expect(normalizeIncomingTags(["  tag1  ", "", "  tag2  "])).toEqual([
        "tag1",
        "tag2",
      ]);
    });

    it("should parse JSON string input", () => {
      expect(normalizeIncomingTags('["tag1", "tag2"]')).toEqual([
        "tag1",
        "tag2",
      ]);
    });

    it("should fall back to comma split for non-JSON string", () => {
      expect(normalizeIncomingTags("tag1, tag2, tag3")).toEqual([
        "tag1",
        "tag2",
        "tag3",
      ]);
    });

    it("should handle mixed types in array", () => {
      expect(normalizeIncomingTags([1, "tag", "other"])).toEqual([
        "1",
        "tag",
        "other",
      ]);
    });

    it("should convert null to string 'null'", () => {
      expect(normalizeIncomingTags([null])).toEqual(["null"]);
    });
  });

  describe("mapProofRow", () => {
    it("should map proof row to SavedProof", () => {
      const row = createProofRow();
      const result = mapProofRow(row);

      expect(result.id).toBe(row.id);
      expect(result.title).toBe(row.title);
      expect(result.content).toBe(row.content);
      expect(result.tags).toEqual(["test", "proof"]);
      expect(result.createdAt).toBe(row.createdAt);
      expect(result.updatedAt).toBe(row.updatedAt);
    });

    it("should handle null tags", () => {
      const row = createProofRow({ tags: null });
      const result = mapProofRow(row);

      expect(result.tags).toEqual([]);
    });

    it("should handle empty tags JSON", () => {
      const row = createProofRow({ tags: "[]" });
      const result = mapProofRow(row);

      expect(result.tags).toEqual([]);
    });
  });
});

describe("Proofs Database Operations", () => {
  let db: Database.Database;

  beforeEach(async () => {
    const dbModule = await import("#server/db");
    (dbModule as unknown as { _resetMockDb: () => void })._resetMockDb?.();
    db = await initializeDatabase();
    db.exec("DELETE FROM proofs");
  });

  afterEach(() => {
    closeDatabase();
  });

  describe("findProofById", () => {
    it("should return undefined for non-existent proof", () => {
      const result = findProofById(db, "nonexistent-id");
      expect(result).toBeUndefined();
    });

    it("should find existing proof by id", () => {
      const id = randomUUID();
      const now = Date.now();

      db.prepare(
        "INSERT INTO proofs (id, title, content, tags, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)",
      ).run(id, "Test", "content", "[]", now, now);

      const result = findProofById(db, id);

      expect(result).toBeDefined();
      expect(result?.id).toBe(id);
      expect(result?.title).toBe("Test");
    });
  });

  describe("CRUD operations", () => {
    it("should create a proof", () => {
      const id = randomUUID();
      const now = Date.now();

      db.prepare(
        "INSERT INTO proofs (id, title, content, tags, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)",
      ).run(
        id,
        "New Proof",
        "theorem new : True := trivial",
        '["new"]',
        now,
        now,
      );

      const result = findProofById(db, id);
      expect(result).toBeDefined();
      expect(result?.title).toBe("New Proof");
    });

    it("should read all proofs ordered by updatedAt", () => {
      const now = Date.now();

      db.prepare(
        "INSERT INTO proofs (id, title, content, tags, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)",
      ).run(randomUUID(), "First", "content", "[]", now, now);

      db.prepare(
        "INSERT INTO proofs (id, title, content, tags, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)",
      ).run(randomUUID(), "Second", "content", "[]", now, now + 1000);

      const rows = db
        .prepare("SELECT * FROM proofs ORDER BY updatedAt DESC")
        .all() as ProofRow[];

      expect(rows).toHaveLength(2);
      expect(rows[0].title).toBe("Second");
      expect(rows[1].title).toBe("First");
    });

    it("should update a proof", () => {
      const id = randomUUID();
      const now = Date.now();

      db.prepare(
        "INSERT INTO proofs (id, title, content, tags, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)",
      ).run(id, "Original", "content", "[]", now, now);

      db.prepare("UPDATE proofs SET title = ?, updatedAt = ? WHERE id = ?").run(
        "Updated",
        now + 1000,
        id,
      );

      const result = findProofById(db, id);
      expect(result?.title).toBe("Updated");
      expect(result?.updatedAt).toBe(now + 1000);
    });

    it("should delete a proof", () => {
      const id = randomUUID();
      const now = Date.now();

      db.prepare(
        "INSERT INTO proofs (id, title, content, tags, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)",
      ).run(id, "ToDelete", "content", "[]", now, now);

      expect(findProofById(db, id)).toBeDefined();

      const result = db.prepare("DELETE FROM proofs WHERE id = ?").run(id);
      expect(result.changes).toBe(1);

      expect(findProofById(db, id)).toBeUndefined();
    });

    it("should return 0 changes when deleting non-existent proof", () => {
      const result = db
        .prepare("DELETE FROM proofs WHERE id = ?")
        .run("nonexistent");
      expect(result.changes).toBe(0);
    });
  });
});
