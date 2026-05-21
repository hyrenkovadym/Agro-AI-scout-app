import cors from "cors";
import crypto from "node:crypto";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "./config.js";
import { createAiClient, analyzePlantImage, buildPlantAnalysisPrompt } from "./services/ai.service.js";
import { createSessionManager, hashPassword, verifyPassword } from "./services/auth.service.js";
import { createJsonStorage } from "./services/storage.service.js";
import {
  asOptionalText,
  asText,
  estimateBase64Bytes,
  isLikelyBase64,
  isSupportedImageMimeType,
  isValidEmail,
  isValidLanguageCode,
  normalizeEmail,
} from "./utils/validation.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const defaultDataDir = path.resolve(__dirname, "..", "data");
const defaultDbPath = path.join(defaultDataDir, "db.json");

const nowIso = () => new Date().toISOString();
const makeId = (prefix) => `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  language: asText(user.language || "uk", 20) || "uk",
  createdAt: user.createdAt,
});

const extractBearerToken = (authorizationHeader) => {
  if (typeof authorizationHeader !== "string") {
    return "";
  }
  if (!authorizationHeader.startsWith("Bearer ")) {
    return "";
  }
  return authorizationHeader.slice("Bearer ".length).trim();
};

export const createApiApp = ({
  config = loadConfig(),
  storage,
  aiClient,
  sessionManager,
  logger = console,
} = {}) => {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: config.jsonBodyLimit }));

  const dataStorage =
    storage ||
    createJsonStorage({
      dbPath: defaultDbPath,
      dataDir: defaultDataDir,
      logger,
    });

  const sessions =
    sessionManager ||
    createSessionManager({
      sessionTtlHours: config.sessionTtlHours,
    });

  const resolvedAiClient =
    aiClient === undefined
      ? createAiClient({
          apiKey: config.openAiApiKey,
          baseURL: config.openAiBaseUrl,
        })
      : aiClient;

  const authMiddleware = async (req, res, next) => {
    try {
      const token = extractBearerToken(req.headers.authorization);
      const session = sessions.getSession(token);
      if (!session) {
        return res.status(401).json({ error: "Unauthorized. Please login again." });
      }

      const db = await dataStorage.loadDb();
      const user = db.users.find((item) => item.id === session.userId);
      if (!user) {
        sessions.invalidateToken(token);
        return res.status(401).json({ error: "Unauthorized. Please login again." });
      }

      req.user = user;
      req.token = token;
      next();
    } catch (error) {
      next(error);
    }
  };

  app.get("/health", async (_req, res, next) => {
    try {
      const db = await dataStorage.loadDb();
      res.json({
        ok: true,
        model: config.openAiModel,
        hasApiKey: Boolean(config.openAiApiKey),
        users: db.users.length,
        clients: db.clients.length,
        analyses: db.analyses.length,
        timestamp: nowIso(),
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/auth/register", async (req, res, next) => {
    try {
      const db = await dataStorage.loadDb();

      const email = normalizeEmail(req.body?.email);
      const password = asText(req.body?.password, 200);
      const name = asText(req.body?.name, 120);

      if (!isValidEmail(email)) {
        return res.status(400).json({ error: "Valid email is required." });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters." });
      }

      if (!name) {
        return res.status(400).json({ error: "Name is required." });
      }

      const exists = db.users.some((item) => item.email === email);
      if (exists) {
        return res.status(409).json({ error: "User with this email already exists." });
      }

      const user = {
        id: makeId("usr"),
        email,
        name,
        language: "uk",
        passwordHash: hashPassword(password),
        createdAt: nowIso(),
      };

      db.users.push(user);
      await dataStorage.persistDb();

      const token = sessions.issueToken(user.id);
      return res.status(201).json({ token, user: publicUser(user) });
    } catch (error) {
      next(error);
    }
  });

  app.post("/auth/login", async (req, res, next) => {
    try {
      const db = await dataStorage.loadDb();

      const email = normalizeEmail(req.body?.email);
      const password = asText(req.body?.password, 200);

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required." });
      }

      const user = db.users.find((item) => item.email === email);
      if (!user) {
        return res.status(404).json({ error: "Account not found. Please register first." });
      }

      if (!verifyPassword(password, user.passwordHash)) {
        return res.status(401).json({ error: "Invalid password." });
      }

      const token = sessions.issueToken(user.id);
      return res.json({ token, user: publicUser(user) });
    } catch (error) {
      next(error);
    }
  });

  app.post("/auth/logout", authMiddleware, (req, res) => {
    if (req.token) {
      sessions.invalidateToken(req.token);
    }
    return res.json({ ok: true });
  });

  app.get("/me", authMiddleware, (req, res) => {
    return res.json({ user: publicUser(req.user) });
  });

  app.patch("/me", authMiddleware, async (req, res, next) => {
    try {
      const db = await dataStorage.loadDb();
      const user = db.users.find((item) => item.id === req.user.id);
      if (!user) {
        return res.status(404).json({ error: "Account not found. Please register first." });
      }

      const nextName = asOptionalText(req.body?.name, 120);
      const nextEmail = normalizeEmail(req.body?.email);
      const nextLanguage = asText(req.body?.language, 20).toLowerCase();

      if (nextName !== null) {
        user.name = nextName;
      }

      if (nextEmail) {
        if (!isValidEmail(nextEmail)) {
          return res.status(400).json({ error: "Valid email is required." });
        }

        const occupied = db.users.some((item) => item.id !== user.id && item.email === nextEmail);
        if (occupied) {
          return res.status(409).json({ error: "User with this email already exists." });
        }
        user.email = nextEmail;
      }

      if (nextLanguage) {
        const normalizedLanguage = nextLanguage.replace(/_/g, "-");
        if (!isValidLanguageCode(normalizedLanguage)) {
          return res.status(400).json({ error: "Language code format is invalid." });
        }
        user.language = normalizedLanguage;
      }

      await dataStorage.persistDb();
      return res.json({ user: publicUser(user) });
    } catch (error) {
      next(error);
    }
  });

  app.post("/me/password", authMiddleware, async (req, res, next) => {
    try {
      const db = await dataStorage.loadDb();
      const user = db.users.find((item) => item.id === req.user.id);
      if (!user) {
        return res.status(404).json({ error: "Account not found. Please register first." });
      }

      const currentPassword = asText(req.body?.currentPassword, 200);
      const newPassword = asText(req.body?.newPassword, 200);

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Current and new password are required." });
      }

      if (!verifyPassword(currentPassword, user.passwordHash)) {
        return res.status(401).json({ error: "Current password is invalid." });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters." });
      }

      user.passwordHash = hashPassword(newPassword);
      await dataStorage.persistDb();
      return res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  app.get("/clients", authMiddleware, async (req, res, next) => {
    try {
      const db = await dataStorage.loadDb();
      const clients = db.clients
        .filter((item) => item.ownerUserId === req.user.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

      return res.json({ clients });
    } catch (error) {
      next(error);
    }
  });

  app.post("/clients", authMiddleware, async (req, res, next) => {
    try {
      const db = await dataStorage.loadDb();

      const name = asText(req.body?.name, 120);
      const company = asOptionalText(req.body?.company, 140);
      const crop = asOptionalText(req.body?.crop, 120);
      const location = asOptionalText(req.body?.location, 140);
      const notes = asOptionalText(req.body?.notes, 500);

      if (!name) {
        return res.status(400).json({ error: "Client name is required." });
      }

      const clientRecord = {
        id: makeId("cln"),
        ownerUserId: req.user.id,
        name,
        company,
        crop,
        location,
        notes,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };

      db.clients.push(clientRecord);
      await dataStorage.persistDb();

      return res.status(201).json({ client: clientRecord });
    } catch (error) {
      next(error);
    }
  });

  app.get("/analyses", authMiddleware, async (req, res, next) => {
    try {
      const db = await dataStorage.loadDb();
      const clientId = asOptionalText(req.query?.clientId, 60);

      const analyses = db.analyses
        .filter((item) => item.ownerUserId === req.user.id)
        .filter((item) => (clientId ? item.clientId === clientId : true))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 80);

      return res.json({ analyses });
    } catch (error) {
      next(error);
    }
  });

  app.post("/analyze-plant", authMiddleware, async (req, res, next) => {
    try {
      if (!resolvedAiClient) {
        return res.status(503).json({ error: "OPENAI_API_KEY is missing in backend/.env" });
      }

      const db = await dataStorage.loadDb();

      const clientId = asText(req.body?.clientId, 60);
      const imageBase64 = asText(req.body?.imageBase64, 12 * 1024 * 1024);
      const imageMimeType = asText(req.body?.imageMimeType, 40) || "image/jpeg";
      const fieldContext = asOptionalText(req.body?.context, 900) || "";
      const expectedPlant = asOptionalText(req.body?.expectedPlant, 120) || "";
      const requestedLanguage = asText(req.body?.language, 20).toLowerCase();
      const targetLanguage = requestedLanguage || asText(req.user?.language || "", 20).toLowerCase() || "uk";

      if (!clientId) {
        return res.status(400).json({ error: "clientId is required." });
      }

      if (!imageBase64) {
        return res.status(400).json({ error: "imageBase64 is required." });
      }

      if (!isLikelyBase64(imageBase64)) {
        return res.status(400).json({ error: "imageBase64 is invalid." });
      }

      if (!isSupportedImageMimeType(imageMimeType)) {
        return res.status(400).json({ error: "Unsupported image type. Use JPEG, PNG, or WEBP." });
      }

      const estimatedBytes = estimateBase64Bytes(imageBase64);
      if (estimatedBytes > config.maxImageBytes) {
        return res.status(413).json({ error: "Image is too large." });
      }

      const clientRecord = db.clients.find(
        (item) => item.id === clientId && item.ownerUserId === req.user.id
      );

      if (!clientRecord) {
        return res.status(404).json({ error: "Client not found." });
      }

      const dataUrl = `data:${imageMimeType};base64,${imageBase64.replace(/\s+/g, "")}`;
      const prompt = buildPlantAnalysisPrompt({
        targetLanguage,
        clientRecord,
        fieldContext,
        expectedPlant,
      });

      const diagnosis = await analyzePlantImage({
        aiClient: resolvedAiClient,
        model: config.openAiModel,
        prompt,
        imageDataUrl: dataUrl,
        expectedPlant,
      });

      const analysisRecord = {
        id: makeId("anl"),
        ownerUserId: req.user.id,
        clientId: clientRecord.id,
        clientName: clientRecord.name,
        crop: clientRecord.crop,
        createdAt: nowIso(),
        diagnosis,
        context: fieldContext,
      };

      db.analyses.push(analysisRecord);
      await dataStorage.persistDb();

      return res.status(201).json({ analysis: analysisRecord });
    } catch (error) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String(error.message)
          : "Unknown analysis error";

      return res.status(500).json({ error: message });
    }
  });

  app.use((error, _req, res, _next) => {
    logger.error?.("Unhandled backend error:", error);
    return res.status(500).json({ error: "Internal server error." });
  });

  return app;
};

