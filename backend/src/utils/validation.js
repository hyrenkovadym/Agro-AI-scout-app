const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LANGUAGE_CODE_REGEX = /^[a-z]{2,8}(-[a-z0-9]{2,8}){0,2}$/i;
const BASE64_REGEX = /^[A-Za-z0-9+/=\s]+$/;

const SUPPORTED_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

export const asText = (value, max = 500) => {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim().slice(0, max);
};

export const asOptionalText = (value, max = 500) => {
  const text = asText(value, max);
  return text.length > 0 ? text : null;
};

export const normalizeEmail = (value) => asText(value, 254).toLowerCase();

export const isValidEmail = (email) => EMAIL_REGEX.test(normalizeEmail(email));

export const isValidLanguageCode = (languageCode) =>
  LANGUAGE_CODE_REGEX.test(asText(languageCode, 20).replace(/_/g, "-"));

export const sanitizeStringArray = (value, maxItems = 6) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => asText(item, 180))
    .filter(Boolean)
    .slice(0, maxItems);
};

export const sanitizeFlexibleArray = (value, maxItems = 6) => {
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

export const isSupportedImageMimeType = (mimeType) =>
  SUPPORTED_IMAGE_MIME_TYPES.has(asText(mimeType, 40).toLowerCase());

export const estimateBase64Bytes = (value) => {
  const normalized = asText(value, 16 * 1024 * 1024).replace(/\s+/g, "");
  if (!normalized) {
    return 0;
  }
  return Math.ceil((normalized.length * 3) / 4);
};

export const isLikelyBase64 = (value) => {
  const normalized = asText(value, 16 * 1024 * 1024).replace(/\s+/g, "");
  if (!normalized) {
    return false;
  }
  return BASE64_REGEX.test(normalized);
};

