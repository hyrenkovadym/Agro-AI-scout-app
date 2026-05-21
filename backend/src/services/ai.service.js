import OpenAI from "openai";
import { asText, sanitizeFlexibleArray } from "../utils/validation.js";

export const createAiClient = ({ apiKey, baseURL }) => {
  if (!apiKey) {
    return null;
  }

  return new OpenAI({
    apiKey,
    baseURL,
  });
};

export const parseJsonObjectFromText = (rawText) => {
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

export const extractOutputText = (response) => {
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

export const normalizeDiagnosis = (parsed, rawText, expectedPlant = "") => {
  if (!parsed || typeof parsed !== "object") {
    return {
      problemName: "Potential plant stress (additional review needed)",
      probability: "low",
      category: "other physiological stress",
      probablePlant: asText(expectedPlant, 120) || "Unknown",
      whatSeen: "Not enough information for a reliable visual diagnosis.",
      confidence: 35,
      severity: "low",
      possibleCauses: [],
      probablePlantAlternatives: [],
      botanicalName: "",
      whatToAdd: [],
      recommendedActions: sanitizeFlexibleArray(rawText, 2),
      additionalChecks: [
        "Add a close-up photo of affected leaves.",
        "Add a full-plant photo in natural light.",
        "Provide crop name, watering routine, and symptom timeline.",
      ],
      preventionTips: [],
      descriptionImpact: "",
      notes:
        "This is a preliminary AI recommendation and may be incomplete. Confirm with an agronomist before critical decisions.",
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
    "bacterial disease": "bacterial disease",
    "viral disease": "viral disease",
    "nutrient deficiency": "nutrient deficiency",
    pests: "pests",
    "overwatering or underwatering": "overwatering or underwatering",
    sunburn: "sunburn",
    "temperature stress": "temperature stress",
    "other physiological stress": "other physiological stress",
  };

  const categoryRaw =
    asText(parsed.category || "", 80).toLowerCase() ||
    asText(parsed.problemCategory || "", 80).toLowerCase();

  const category = categoryAliases[categoryRaw] || "other physiological stress";

  const problemName = asText(parsed.problemName || "", 140) || "Potential physiological plant stress";
  const probablePlant =
    asText(parsed.probablePlant || "", 120) ||
    asText(parsed.suspectedPlant || "", 120) ||
    asText(parsed.plantName || "", 120) ||
    asText(expectedPlant, 120) ||
    "Unknown";

  const whatSeen =
    asText(parsed.whatSeen || "", 400) ||
    asText(parsed.visibleSigns || "", 400) ||
    "Symptoms were not described in detail by the model.";

  const possibleCauses = sanitizeFlexibleArray(parsed.possibleCauses, 8);
  const probablePlantAlternatives = sanitizeFlexibleArray(parsed.probablePlantAlternatives, 4);
  const botanicalName = asText(parsed.botanicalName || "", 120);
  const recommendedActions = sanitizeFlexibleArray(parsed.recommendedActions, 8);
  const whatToAdd = sanitizeFlexibleArray(parsed.whatToAdd, 8);
  const additionalChecks = sanitizeFlexibleArray(parsed.additionalChecks, 8);
  const descriptionImpact =
    asText(parsed.descriptionImpact || "", 320) || asText(parsed.contextImpact || "", 320) || "";

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
      "This is a preliminary AI recommendation. Confirm with an agronomist before treatment decisions.",
  };
};

export const buildPlantAnalysisPrompt = ({
  targetLanguage,
  clientRecord,
  fieldContext,
  expectedPlant,
}) => {
  return [
    "You are an expert agronomy and botany assistant for plant diagnostics.",
    `Write all explanatory text in language code "${targetLanguage}".`,
    "Use the image as the primary source of truth.",
    "User hints are weak context and may be wrong.",
    "If user hint conflicts with image evidence, trust image evidence.",
    "Do not claim absolute certainty from one image.",
    "Return practical and safe recommendations only.",
    "The result is preliminary and must include caveats.",
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
    '  "problemName": "short likely problem title",',
    '  "probablePlant": "likely plant name",',
    '  "probablePlantAlternatives": ["2-3 alternatives"],',
    '  "botanicalName": "Latin botanical name if likely, else empty string",',
    '  "probability": "low|medium|high",',
    '  "category": "fungal disease|bacterial disease|viral disease|nutrient deficiency|pests|overwatering or underwatering|sunburn|temperature stress|other physiological stress",',
    '  "whatSeen": "visible symptoms",',
    '  "possibleCauses": ["2-3 likely causes"],',
    '  "recommendedActions": ["step-by-step actions"],',
    '  "whatToAdd": ["what to add/apply"],',
    '  "additionalChecks": ["what to verify for better accuracy"],',
    '  "descriptionImpact": "how user context changed/confirmed result",',
    '  "notes": "important caveat",',
    '  "confidence": 0',
    "}",
    "Client context:",
    `- Client: ${clientRecord.name}`,
    `- Crop in profile (may be outdated): ${clientRecord.crop || "not specified"}`,
    `- Expected plant from user (weak hint): ${expectedPlant || "not specified"}`,
    `- Location: ${clientRecord.location || "not specified"}`,
    `- User symptom description: ${fieldContext || "not provided"}`,
  ].join("\n");
};

export const analyzePlantImage = async ({
  aiClient,
  model,
  prompt,
  imageDataUrl,
  expectedPlant,
}) => {
  const response = await aiClient.responses.create({
    model,
    temperature: 0.2,
    max_output_tokens: 1600,
    input: [
      {
        role: "user",
        content: [
          { type: "input_text", text: prompt },
          { type: "input_image", image_url: imageDataUrl },
        ],
      },
    ],
  });

  const rawText = extractOutputText(response);
  const parsed = parseJsonObjectFromText(rawText);
  return normalizeDiagnosis(parsed, rawText, expectedPlant);
};

