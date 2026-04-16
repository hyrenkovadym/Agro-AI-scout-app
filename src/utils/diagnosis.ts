import { Diagnosis } from "../types";

const severityToProbability: Record<string, string> = {
  low: "низька",
  medium: "середня",
  high: "висока",
};

export const formatDateTime = (isoValue: string): string => {
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) {
    return isoValue;
  }

  try {
    return new Intl.DateTimeFormat("uk-UA", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
};

export const resolveProbability = (diagnosis: Diagnosis): string => {
  const fromField = diagnosis.probability?.trim().toLowerCase();
  if (fromField) {
    if (fromField.includes("низ")) return "низька";
    if (fromField.includes("вис")) return "висока";
    if (fromField.includes("серед")) return "середня";
    if (fromField === "low") return "низька";
    if (fromField === "high") return "висока";
    if (fromField === "medium") return "середня";
  }

  if (typeof diagnosis.confidence === "number" && Number.isFinite(diagnosis.confidence)) {
    if (diagnosis.confidence >= 76) return "висока";
    if (diagnosis.confidence >= 41) return "середня";
    return "низька";
  }

  if (diagnosis.severity) {
    return severityToProbability[diagnosis.severity] || "середня";
  }

  return "середня";
};

export const translateCategory = (category: string): string => {
  const normalized = category.trim().toLowerCase();
  const map: Record<string, string> = {
    "fungal disease": "грибкова хвороба",
    "bacterial disease": "бактеріальна хвороба",
    "viral disease": "вірусна хвороба",
    "nutrient deficiency": "дефіцит поживних речовин",
    pests: "шкідники",
    "overwatering or underwatering": "перелив або недолив",
    sunburn: "сонячний опік",
    "temperature stress": "температурний стрес",
    "other physiological stress": "інший фізіологічний стрес",
  };

  return map[normalized] || category;
};
