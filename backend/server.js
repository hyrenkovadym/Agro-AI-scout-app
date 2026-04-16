
import "dotenv/config";
import cors from "cors";
import crypto from "node:crypto";
import express from "express";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import OpenAI from "openai";

const PORT = Number(process.env.PORT || 8787);
const MODEL = process.env.OPENAI_MODEL || "gpt-5";
const API_KEY = process.env.OPENAI_API_KEY;
const BASE_URL = process.env.OPENAI_BASE_URL || undefined;
const SESSION_TTL_HOURS = Number(process.env.SESSION_TTL_HOURS || 24 * 14);
const MAX_IMAGE_BYTES = Number(process.env.MAX_IMAGE_BYTES || 7 * 1024 * 1024);

const aiClient = API_KEY
  ? new OpenAI({
      apiKey: API_KEY,
      baseURL: BASE_URL,
    })
  : null;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, "data");
const dbPath = path.join(dataDir, "db.json");

const app = express();
app.use(cors());
app.use(express.json({ limit: "12mb" }));

const sessions = new Map();

const createEmptyDb = () => ({
  users: [],
  clients: [],
  analyses: [],
});

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
    const parsed = JSON.parse(raw);
    dbCache = {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      clients: Array.isArray(parsed.clients) ? parsed.clients : [],
      analyses: Array.isArray(parsed.analyses) ? parsed.analyses : [],
    };
  } catch {
    dbCache = createEmptyDb();
  }

  return dbCache;
};

const persistDb = async () => {
  await loadDb();
  const snapshot = JSON.stringify(dbCache, null, 2);

  dbWriteQueue = dbWriteQueue
    .then(() => fs.writeFile(dbPath, snapshot, "utf8"))
    .catch((error) => {
      console.error("DB write failed:", error);
    });

  await dbWriteQueue;
};

const nowIso = () => new Date().toISOString();
const makeId = (prefix) => `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

const asText = (value, max = 500) => {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim().slice(0, max);
};

const asOptionalText = (value, max = 500) => {
  const text = asText(value, max);
  return text.length > 0 ? text : null;
};

const normalizeEmail = (value) => asText(value, 254).toLowerCase();

const hashPassword = (password, salt = crypto.randomBytes(16).toString("hex")) => {
  const digest = crypto.createHash("sha256").update(`${salt}:${password}`).digest("hex");
  return `${salt}$${digest}`;
};

const verifyPassword = (password, hash) => {
  if (typeof hash !== "string" || !hash.includes("$")) {
    return false;
  }

  const [salt, expectedDigest] = hash.split("$");
  if (!salt || !expectedDigest) {
    return false;
  }

  const actualDigest = crypto.createHash("sha256").update(`${salt}:${password}`).digest("hex");
  if (expectedDigest.length !== actualDigest.length) {
    return false;
  }

  return crypto.timingSafeEqual(Buffer.from(expectedDigest), Buffer.from(actualDigest));
};

const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  language: asText(user.language || "uk", 20) || "uk",
  createdAt: user.createdAt,
});

const issueToken = (userId) => {
  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000;
  sessions.set(token, { userId, expiresAt });
  return token;
};

const getUserFromToken = async (token) => {
  if (!token || typeof token !== "string") {
    return null;
  }

  const session = sessions.get(token);
  if (!session) {
    return null;
  }

  if (session.expiresAt <= Date.now()) {
    sessions.delete(token);
    return null;
  }

  const db = await loadDb();
  const user = db.users.find((item) => item.id === session.userId);
  if (!user) {
    sessions.delete(token);
    return null;
  }

  return user;
};

const authMiddleware = async (req, res, next) => {
  const header = req.headers.authorization;
  const token = typeof header === "string" && header.startsWith("Bearer ")
    ? header.slice("Bearer ".length).trim()
    : "";

  const user = await getUserFromToken(token);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized. Please login again." });
  }

  req.user = user;
  req.token = token;
  next();
};

const sanitizeStringArray = (value, maxItems = 6) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => asText(item, 180))
    .filter(Boolean)
    .slice(0, maxItems);
};

const sanitizeFlexibleArray = (value, maxItems = 6) => {
  if (Array.isArray(value)) {
    return sanitizeStringArray(value, maxItems);
  }

  if (typeof value === "string") {
    const normalized = value
      .split(/\r?\n|;|,/)
      .map((part) => part.trim())
      .filter(Boolean);

    if (normalized.length > 0) {
      return sanitizeStringArray(normalized, maxItems);
    }

    const single = asText(value, 180);
    return single ? [single] : [];
  }

  return [];
};

const parseJsonObjectFromText = (rawText) => {
  if (!rawText || typeof rawText !== "string") {
    return null;
  }

  const cleaned = rawText
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```/i, "")
    .replace(/```$/, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
      return null;
    }

    const candidate = cleaned.slice(start, end + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      return null;
    }
  }
};

const extractOutputText = (response) => {
  const direct = typeof response?.output_text === "string" ? response.output_text.trim() : "";
  if (direct) {
    return direct;
  }

  const output = Array.isArray(response?.output) ? response.output : [];
  const chunks = [];

  for (const item of output) {
    const contentBlocks = Array.isArray(item?.content) ? item.content : [];
    for (const block of contentBlocks) {
      if (typeof block?.text === "string" && block.text.trim()) {
        chunks.push(block.text.trim());
      }
      if (typeof block?.output_text === "string" && block.output_text.trim()) {
        chunks.push(block.output_text.trim());
      }
    }
  }

  return chunks.join("\n").trim();
};

const normalizeProbability = (value) => {
  const normalized = asText(value || "", 30).toLowerCase();

  if (normalized === "low") return "low";
  if (normalized === "medium") return "medium";
  if (normalized === "high") return "high";

  if (normalized.includes("low")) return "low";
  if (normalized.includes("medium")) return "medium";
  if (normalized.includes("high")) return "high";

  if (normalized.includes("низ")) return "low";
  if (normalized.includes("серед")) return "medium";
  if (normalized.includes("вис")) return "high";

  return "";
};

const probabilityFromConfidence = (confidence) => {
  if (!Number.isFinite(confidence)) {
    return "";
  }
  if (confidence >= 76) return "high";
  if (confidence >= 41) return "medium";
  return "low";
};

const severityFromProbability = (probability) => {
  if (probability === "high") return "high";
  if (probability === "low") return "low";
  return "medium";
};

const normalizeDiagnosis = (parsed, rawText, expectedPlant = "") => {
  if (!parsed || typeof parsed !== "object") {
    return {
      problemName: "Ймовірний стрес рослини (потрібен додатковий огляд)",
      probability: "low",
      category: "other physiological stress",
      probablePlant: asText(expectedPlant, 120) || "Не вдалося визначити",
      whatSeen: "Недостатньо даних для точного висновку.",
      confidence: 35,
      severity: "low",
      possibleCauses: [],
      probablePlantAlternatives: [],
      botanicalName: "",
      whatToAdd: [],
      recommendedActions: sanitizeFlexibleArray(rawText, 2),
      additionalChecks: [
        "Додайте фото крупним планом",
        "Додайте фото всієї рослини",
        "Уточніть культуру, умови поливу та дату появи симптомів",
      ],
      preventionTips: [],
      descriptionImpact: "",
      notes: "Це попередній аналіз. Для підтвердження потрібні додаткові фото або огляд агронома.",
    };
  }

  const confidenceRaw = Number(parsed.confidence);
  const confidence = Math.max(0, Math.min(100, Number.isFinite(confidenceRaw) ? confidenceRaw : 55));

  const probability =
    normalizeProbability(parsed.probability) ||
    normalizeProbability(parsed.probabilityLevel) ||
    probabilityFromConfidence(confidence) ||
    "medium";

  const categoryAliases = {
    "fungal disease": "fungal disease",
    "грибкова хвороба": "fungal disease",
    "bacterial disease": "bacterial disease",
    "бактеріальна хвороба": "bacterial disease",
    "viral disease": "viral disease",
    "вірусна хвороба": "viral disease",
    "nutrient deficiency": "nutrient deficiency",
    "дефіцит поживних речовин": "nutrient deficiency",
    pests: "pests",
    "шкідники": "pests",
    "overwatering or underwatering": "overwatering or underwatering",
    "перелив або недолив": "overwatering or underwatering",
    sunburn: "sunburn",
    "сонячний опік": "sunburn",
    "temperature stress": "temperature stress",
    "температурний стрес": "temperature stress",
    "other physiological stress": "other physiological stress",
    "інший фізіологічний стрес": "other physiological stress",
  };

  const categoryRaw =
    asText(parsed.category || "", 80).toLowerCase() ||
    asText(parsed.problemCategory || "", 80).toLowerCase();

  const category = categoryAliases[categoryRaw] || "other physiological stress";

  const problemName = asText(parsed.problemName || "", 140) || "Ймовірний фізіологічний стрес рослини";
  const probablePlant =
    asText(parsed.probablePlant || "", 120) ||
    asText(parsed.suspectedPlant || "", 120) ||
    asText(parsed.plantName || "", 120) ||
    asText(expectedPlant, 120) ||
    "Не вдалося визначити";

  const whatSeen =
    asText(parsed.whatSeen || "", 400) ||
    asText(parsed.visibleSigns || "", 400) ||
    "Ознаки не деталізовано. Потрібне чіткіше фото.";

  const possibleCauses = sanitizeFlexibleArray(parsed.possibleCauses, 8);
  const probablePlantAlternatives = sanitizeFlexibleArray(parsed.probablePlantAlternatives, 4);
  const botanicalName = asText(parsed.botanicalName || "", 120);
  const recommendedActions = sanitizeFlexibleArray(parsed.recommendedActions, 8);
  const whatToAdd = sanitizeFlexibleArray(parsed.whatToAdd, 8);
  const additionalChecks = sanitizeFlexibleArray(parsed.additionalChecks, 8);
  const descriptionImpact =
    asText(parsed.descriptionImpact || "", 320) ||
    asText(parsed.contextImpact || "", 320) ||
    "";

  return {
    problemName,
    probability,
    category,
    probablePlant,
    whatSeen,
    confidence,
    severity: severityFromProbability(probability),
    possibleCauses,
    probablePlantAlternatives,
    botanicalName,
    whatToAdd,
    recommendedActions,
    additionalChecks,
    preventionTips: sanitizeFlexibleArray(parsed.preventionTips, 8),
    descriptionImpact,
    notes:
      asText(parsed.notes || "", 450) ||
      "Це попередній аналіз. Для точного підтвердження потрібні додаткові фото або огляд агронома.",
  };
};

app.get("/health", async (_req, res) => {
  const db = await loadDb();
  res.json({
    ok: true,
    model: MODEL,
    hasApiKey: Boolean(API_KEY),
    users: db.users.length,
    clients: db.clients.length,
    analyses: db.analyses.length,
    timestamp: nowIso(),
  });
});

app.post("/auth/register", async (req, res) => {
  const db = await loadDb();

  const email = normalizeEmail(req.body?.email);
  const password = asText(req.body?.password, 200);
  const name = asText(req.body?.name, 120);

  if (!email || !email.includes("@")) {
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
  await persistDb();

  const token = issueToken(user.id);
  return res.status(201).json({ token, user: publicUser(user) });
});

app.post("/auth/login", async (req, res) => {
  const db = await loadDb();

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

  const token = issueToken(user.id);
  return res.json({ token, user: publicUser(user) });
});

app.post("/auth/logout", authMiddleware, async (req, res) => {
  if (req.token) {
    sessions.delete(req.token);
  }
  return res.json({ ok: true });
});

app.get("/me", authMiddleware, (req, res) => {
  return res.json({ user: publicUser(req.user) });
});

app.patch("/me", authMiddleware, async (req, res) => {
  const db = await loadDb();
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
    if (!nextEmail.includes("@")) {
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
    if (!/^[a-z]{2,8}(-[a-z0-9]{2,8}){0,2}$/i.test(normalizedLanguage)) {
      return res.status(400).json({ error: "Language code format is invalid." });
    }
    user.language = normalizedLanguage;
  }

  await persistDb();
  return res.json({ user: publicUser(user) });
});

app.post("/me/password", authMiddleware, async (req, res) => {
  const db = await loadDb();
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
  await persistDb();
  return res.json({ ok: true });
});

app.get("/clients", authMiddleware, async (req, res) => {
  const db = await loadDb();
  const clients = db.clients
    .filter((item) => item.ownerUserId === req.user.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return res.json({ clients });
});

app.post("/clients", authMiddleware, async (req, res) => {
  const db = await loadDb();

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
  await persistDb();

  return res.status(201).json({ client: clientRecord });
});

app.get("/analyses", authMiddleware, async (req, res) => {
  const db = await loadDb();
  const clientId = asOptionalText(req.query?.clientId, 60);

  const analyses = db.analyses
    .filter((item) => item.ownerUserId === req.user.id)
    .filter((item) => (clientId ? item.clientId === clientId : true))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 80);

  return res.json({ analyses });
});

app.post("/analyze-plant", authMiddleware, async (req, res) => {
  if (!aiClient) {
    return res.status(503).json({ error: "OPENAI_API_KEY is missing in backend/.env" });
  }

  const db = await loadDb();

  const clientId = asText(req.body?.clientId, 60);
  const imageBase64 = asText(req.body?.imageBase64, 12 * 1024 * 1024);
  const imageMimeType = asText(req.body?.imageMimeType, 40) || "image/jpeg";
  const fieldContext = asOptionalText(req.body?.context, 900) || "";
  const expectedPlant = asOptionalText(req.body?.expectedPlant, 120) || "";
  const requestedLanguage = asText(req.body?.language, 20).toLowerCase();
  const targetLanguage =
    requestedLanguage || asText(req.user?.language || "", 20).toLowerCase() || "uk";

  if (!clientId) {
    return res.status(400).json({ error: "clientId is required." });
  }

  if (!imageBase64) {
    return res.status(400).json({ error: "imageBase64 is required." });
  }

  const estimatedBytes = Math.ceil((imageBase64.length * 3) / 4);
  if (estimatedBytes > MAX_IMAGE_BYTES) {
    return res.status(413).json({ error: "Image is too large." });
  }

  const clientRecord = db.clients.find(
    (item) => item.id === clientId && item.ownerUserId === req.user.id
  );

  if (!clientRecord) {
    return res.status(404).json({ error: "Client not found." });
  }

  const dataUrl = `data:${imageMimeType};base64,${imageBase64}`;

  const prompt = [
    "You are an expert global agronomy and botany assistant for plant diagnostics.",
    `CRITICAL: Write all explanatory text in language code "${targetLanguage}".`,
    "You are NOT limited to a short crop list. Consider any plant species worldwide, including houseplants.",
    "Main workflow (strict order):",
    "1) Identify the most likely plant from visual evidence in the image.",
    "2) Then detect likely problem(s) for that identified plant.",
    "3) Use user hints (expected plant, search text, profile crop) only as weak context. They may be wrong.",
    "4) If user hint conflicts with image, trust image evidence and mention mismatch in notes.",
    "5) If user added extra context, explain how it changed or confirmed the diagnosis.",
    "Goal: practical, safety-first preliminary diagnosis from image + context.",
    "Do not claim absolute certainty from one image.",
    "Do not invent facts not visible in image or provided by user.",
    "If confidence is limited, say so and request better photos/context.",
    "Return likely plant name, optional botanical name, and 2-3 alternatives.",
    "Recommendations order: safe immediate actions -> optional fertilizers/treatments.",
    "Do not recommend dangerous or illegal actions.",
    "Problem category must be one of:",
    "- fungal disease",
    "- bacterial disease",
    "- viral disease",
    "- nutrient deficiency",
    "- pests",
    "- overwatering or underwatering",
    "- sunburn",
    "- temperature stress",
    "- other physiological stress",
    "Return ONLY valid JSON. No markdown.",
    "JSON schema:",
    "{",
    '  "problemName": "short likely problem title in target language",',
    '  "probablePlant": "likely plant name in target language",',
    '  "probablePlantAlternatives": ["2-3 alternatives in target language"],',
    '  "botanicalName": "Latin botanical name if likely, otherwise empty string",',
    '  "probability": "low|medium|high",',
    '  "category": "fungal disease|bacterial disease|viral disease|nutrient deficiency|pests|overwatering or underwatering|sunburn|temperature stress|other physiological stress",',
    '  "whatSeen": "visible symptoms in target language",',
    '  "possibleCauses": ["2-3 likely causes in target language"],',
    '  "recommendedActions": ["step-by-step actions in target language"],',
    '  "whatToAdd": ["what to add/apply in target language"],',
    '  "additionalChecks": ["what to verify for better accuracy in target language"],',
    '  "descriptionImpact": "how user text context changed/confirmed the result in target language",',
    '  "notes": "important caveat in target language",',
    '  "confidence": 0',
    "}",
    "Client context:",
    `- Client: ${clientRecord.name}`,
    `- Crop in profile (may be outdated): ${clientRecord.crop || "not specified"}`,
    `- Expected plant from user (weak hint): ${expectedPlant || "not specified"}`,
    `- Location: ${clientRecord.location || "not specified"}`,
    `- User symptom description: ${fieldContext || "not provided"}`,
  ].join("\n");

  try {
    const response = await aiClient.responses.create({
      model: MODEL,
      temperature: 0.2,
      max_output_tokens: 1600,
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: prompt },
            { type: "input_image", image_url: dataUrl },
          ],
        },
      ],
    });

    const rawText = extractOutputText(response);
    const parsed = parseJsonObjectFromText(rawText);
    const diagnosis = normalizeDiagnosis(parsed, rawText, expectedPlant);

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
    await persistDb();

    return res.status(201).json({ analysis: analysisRecord });
  } catch (error) {
    const message =
      error && typeof error === "object" && "message" in error
        ? String(error.message)
        : "Unknown analysis error";

    return res.status(500).json({ error: message });
  }
});

app.listen(PORT, () => {
  console.log(`Agro AI backend is running on http://localhost:${PORT}`);
  if (!API_KEY) {
    console.warn("Warning: OPENAI_API_KEY is empty. /analyze-plant will return 503.");
  }
});
