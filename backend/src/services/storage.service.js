import { promises as fs } from "node:fs";

export const createEmptyDb = () => ({
  users: [],
  clients: [],
  analyses: [],
});

const sanitizeDb = (parsed) => ({
  users: Array.isArray(parsed?.users) ? parsed.users : [],
  clients: Array.isArray(parsed?.clients) ? parsed.clients : [],
  analyses: Array.isArray(parsed?.analyses) ? parsed.analyses : [],
});

export const createJsonStorage = ({ dbPath, dataDir, logger = console }) => {
  if (!dbPath || !dataDir) {
    throw new Error("dbPath and dataDir are required for JSON storage.");
  }

  let dbCache = null;
  let dbWriteQueue = Promise.resolve();

  const ensureDbFile = async () => {
    await fs.mkdir(dataDir, { recursive: true });
    try {
      await fs.access(dbPath);
    } catch {
      await fs.writeFile(dbPath, JSON.stringify(createEmptyDb(), null, 2), "utf8");
    }
  };

  const loadDb = async () => {
    if (dbCache) {
      return dbCache;
    }

    await ensureDbFile();
    const raw = await fs.readFile(dbPath, "utf8");

    try {
      dbCache = sanitizeDb(JSON.parse(raw));
    } catch {
      dbCache = createEmptyDb();
    }

    return dbCache;
  };

  const persistDb = async () => {
    const db = await loadDb();
    const snapshot = JSON.stringify(db, null, 2);

    const writeTask = async () => {
      await fs.writeFile(dbPath, snapshot, "utf8");
    };

    dbWriteQueue = dbWriteQueue.then(writeTask, writeTask).catch((error) => {
      logger.error?.("DB write failed:", error);
      throw error;
    });

    await dbWriteQueue;
  };

  const resetCache = () => {
    dbCache = null;
  };

  return {
    loadDb,
    persistDb,
    resetCache,
    dbPath,
    dataDir,
  };
};

