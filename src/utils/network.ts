import Constants from "expo-constants";
import { Platform } from "react-native";

const defaultApiUrl =
  Platform.OS === "android" ? "http://10.0.2.2:8787" : "http://localhost:8787";

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

export const buildFriendlyError = (error: unknown): string => {
  const hasCyrillic = (text: string) => /[А-Яа-яЇїІіЄєҐґ]/.test(text);
  const hasLatin = (text: string) => /[A-Za-z]/.test(text);

  if (error instanceof ApiError && error.message.trim()) {
    const backendMap: Record<string, string> = {
      "Valid email is required.": "Вкажіть коректну ел. пошту.",
      "Password must be at least 6 characters.": "Пароль має містити щонайменше 6 символів.",
      "Name is required.": "Вкажіть ім'я.",
      "User with this email already exists.": "Користувач з таким email вже існує.",
      "Email and password are required.": "Вкажіть email і пароль.",
      "Account not found. Please register first.": "Акаунт не знайдено. Спочатку зареєструйтесь.",
      "Invalid password.": "Невірний пароль.",
      "Current and new password are required.": "Вкажіть поточний і новий пароль.",
      "Current password is invalid.": "Поточний пароль невірний.",
      "Language code format is invalid.": "Невірний формат коду мови (наприклад: uk, en, pl, pt-BR).",
      "Unauthorized. Please login again.": "Сесію завершено. Увійдіть повторно.",
      "Client name is required.": "Вкажіть ім'я клієнта.",
      "OPENAI_API_KEY is missing in backend/.env": "У backend/.env відсутній OPENAI_API_KEY.",
      "clientId is required.": "Поле clientId є обов'язковим.",
      "imageBase64 is required.": "Потрібно додати фото (imageBase64).",
      "Image is too large.": "Фото занадто велике. Спробуйте менший розмір.",
      "Client not found.": "Клієнта не знайдено.",
      "Unknown analysis error": "Невідома помилка аналізу.",
    };

    if (backendMap[error.message]) {
      return backendMap[error.message];
    }

    if (hasLatin(error.message) && !hasCyrillic(error.message)) {
      return "Сталася помилка сервера. Спробуйте ще раз.";
    }

    return error.message;
  }

  if (error instanceof Error) {
    const message = error.message.trim();
    if (message === "Network request failed" || message === "fetch failed") {
      return `Не вдалося підключитися до API (${apiUrl}). Перевірте запуск backend і мережу.`;
    }

    if (message) {
      if (hasLatin(message) && !hasCyrillic(message)) {
        return "Сталася помилка застосунку. Спробуйте ще раз.";
      }
      return message;
    }
  }

  return "Сталася невідома помилка. Спробуйте ще раз.";
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
    throw new ApiError(data?.error || `Помилка запиту (${response.status})`, response.status);
  }

  return (data ?? {}) as T;
};
