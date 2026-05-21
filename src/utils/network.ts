import Constants from "expo-constants";
import { Platform } from "react-native";

const defaultApiUrl = Platform.OS === "android" ? "http://10.0.2.2:8787" : "http://localhost:8787";

const extractHost = (value: string | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    if (trimmed.includes("://")) {
      const parsed = new URL(trimmed);
      return parsed.hostname || null;
    }
  } catch {
    // fallback below
  }

  const withoutProtocol = trimmed.replace(/^\w+:\/\//, "");
  const hostAndPort = withoutProtocol.split("/")[0] ?? "";
  const host = hostAndPort.split(":")[0] ?? "";
  return host || null;
};

const detectDevHost = (): string | null => {
  const candidates: Array<string | null | undefined> = [
    Constants.expoConfig?.hostUri,
    Constants.expoGoConfig?.debuggerHost,
    Constants.linkingUri,
  ];

  for (const candidate of candidates) {
    const host = extractHost(candidate);
    if (host) {
      return host;
    }
  }

  return null;
};

const inferApiUrl = (): string => {
  const detectedHost = detectDevHost();
  if (!detectedHost) {
    return defaultApiUrl;
  }

  const normalizedHost = detectedHost.toLowerCase();
  if (normalizedHost === "localhost" || normalizedHost === "127.0.0.1") {
    return defaultApiUrl;
  }

  return `http://${detectedHost}:8787`;
};

const rawApiUrl = process.env.EXPO_PUBLIC_AI_API_URL || inferApiUrl();
export const apiUrl = rawApiUrl.replace(/\/$/, "");

export class ApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const backendErrorMap: Record<string, string> = {
  "Valid email is required.": "Please enter a valid email address.",
  "Password must be at least 6 characters.": "Password must contain at least 6 characters.",
  "Name is required.": "Please enter your name.",
  "User with this email already exists.": "An account with this email already exists.",
  "Email and password are required.": "Please enter email and password.",
  "Account not found. Please register first.": "Account not found. Please register first.",
  "Invalid password.": "Invalid password.",
  "Current and new password are required.": "Please enter current and new password.",
  "Current password is invalid.": "Current password is invalid.",
  "Language code format is invalid.": "Invalid language code format (e.g., uk, en, pl, pt-BR).",
  "Unauthorized. Please login again.": "Session expired. Please sign in again.",
  "Client name is required.": "Client name is required.",
  "OPENAI_API_KEY is missing in backend/.env":
    "Backend OPENAI_API_KEY is missing in backend/.env.",
  "clientId is required.": "clientId is required.",
  "imageBase64 is required.": "Photo data is required (imageBase64).",
  "imageBase64 is invalid.": "Photo data format is invalid. Please try another image.",
  "Unsupported image type. Use JPEG, PNG, or WEBP.":
    "Unsupported image type. Use JPEG, PNG, or WEBP.",
  "Image is too large.": "Image is too large. Please use a smaller photo.",
  "Client not found.": "Client not found.",
  "Unknown analysis error": "Unknown analysis error.",
};

export const buildFriendlyError = (error: unknown): string => {
  if (error instanceof ApiError && error.message.trim()) {
    return backendErrorMap[error.message] || error.message;
  }

  if (error instanceof Error) {
    const message = error.message.trim();
    if (message === "Network request failed" || message === "fetch failed") {
      return `Cannot connect to API (${apiUrl}). Check backend status and local network access.`;
    }

    if (message) {
      return message;
    }
  }

  return "Unknown application error. Please try again.";
};

export const apiRequest = async <T,>(
  path: string,
  options: {
    method?: "GET" | "POST" | "PATCH";
    token?: string;
    body?: Record<string, unknown>;
  } = {}
): Promise<T> => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(`${apiUrl}${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = (await response.json().catch(() => null)) as
    | (Record<string, unknown> & { error?: string })
    | null;

  if (!response.ok) {
    throw new ApiError(data?.error || `Request failed (${response.status})`, response.status);
  }

  return (data ?? {}) as T;
};

