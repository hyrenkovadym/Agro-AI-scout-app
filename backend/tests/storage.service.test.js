import assert from "node:assert/strict";
import test from "node:test";
import os from "node:os";
import path from "node:path";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createJsonStorage } from "../src/services/storage.service.js";

const makeTempStorage = async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "agro-ai-storage-test-"));
  const dbPath = path.join(tempDir, "db.json");
  const storage = createJsonStorage({
    dbPath,
    dataDir: tempDir,
    logger: { log: () => {}, warn: () => {}, error: () => {} },
  });
  return { storage, tempDir, dbPath };
};

test("storage creates empty db and persists updates", async (t) => {
  const { storage, tempDir, dbPath } = await makeTempStorage();
  t.after(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  const db = await storage.loadDb();
  assert.deepEqual(db, { users: [], clients: [], analyses: [] });

  db.users.push({
    id: "usr_1",
    email: "user@example.com",
    name: "User",
    passwordHash: "salt$hash",
    createdAt: new Date().toISOString(),
  });
  await storage.persistDb();

  storage.resetCache();
  const persisted = await storage.loadDb();
  assert.equal(persisted.users.length, 1);

  const raw = await readFile(dbPath, "utf8");
  assert.equal(raw.includes("user@example.com"), true);
});

test("storage recovers from malformed JSON file", async (t) => {
  const { storage, tempDir, dbPath } = await makeTempStorage();
  t.after(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  await writeFile(dbPath, "{not-valid-json", "utf8");
  storage.resetCache();

  const recovered = await storage.loadDb();
  assert.deepEqual(recovered, { users: [], clients: [], analyses: [] });
});

