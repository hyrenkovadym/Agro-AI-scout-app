import os from "node:os";
import path from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { createApiApp } from "../../src/app.js";
import { createJsonStorage } from "../../src/services/storage.service.js";

const silentLogger = {
  log: () => {},
  warn: () => {},
  error: () => {},
};

export const createTestApp = async ({
  aiClient = null,
  openAiApiKey = "",
  sessionTtlHours = 24,
} = {}) => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "agro-ai-scout-test-"));
  const dbPath = path.join(tempDir, "db.json");

  const storage = createJsonStorage({
    dbPath,
    dataDir: tempDir,
    logger: silentLogger,
  });

  const config = {
    port: 0,
    openAiModel: "gpt-5",
    openAiApiKey,
    openAiBaseUrl: undefined,
    sessionTtlHours,
    maxImageBytes: 7 * 1024 * 1024,
    jsonBodyLimit: "12mb",
  };

  const app = createApiApp({
    config,
    storage,
    aiClient,
    logger: silentLogger,
  });

  return {
    app,
    storage,
    dbPath,
    tempDir,
    cleanup: async () => {
      await rm(tempDir, { recursive: true, force: true });
    },
  };
};

