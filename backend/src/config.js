const parseNumberEnv = (value, fallback, { min, max } = {}) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  if (typeof min === "number" && parsed < min) {
    return fallback;
  }
  if (typeof max === "number" && parsed > max) {
    return fallback;
  }

  return parsed;
};

export const loadConfig = (env = process.env) => ({
  port: parseNumberEnv(env.PORT, 8787, { min: 1, max: 65535 }),
  openAiModel: typeof env.OPENAI_MODEL === "string" && env.OPENAI_MODEL.trim() ? env.OPENAI_MODEL.trim() : "gpt-5",
  openAiApiKey: typeof env.OPENAI_API_KEY === "string" ? env.OPENAI_API_KEY.trim() : "",
  openAiBaseUrl:
    typeof env.OPENAI_BASE_URL === "string" && env.OPENAI_BASE_URL.trim()
      ? env.OPENAI_BASE_URL.trim()
      : undefined,
  sessionTtlHours: parseNumberEnv(env.SESSION_TTL_HOURS, 24 * 14, { min: 1, max: 24 * 365 }),
  maxImageBytes: parseNumberEnv(env.MAX_IMAGE_BYTES, 7 * 1024 * 1024, {
    min: 256 * 1024,
    max: 25 * 1024 * 1024,
  }),
  jsonBodyLimit: "12mb",
});

