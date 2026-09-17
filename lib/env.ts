const DEFAULT_DATABASE_URL = "file:./prisma/dev.db";
export const DEFAULT_OLLAMA_CALL_TIMEOUT_MS = 600_000;

export class AppConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AppConfigError";
  }
}

export function isAppConfigError(error: unknown): error is AppConfigError {
  return error instanceof AppConfigError;
}

export function getDatabaseUrl(): string {
  return process.env.DATABASE_URL?.trim() || DEFAULT_DATABASE_URL;
}

export function getOllamaBaseUrl(): string {
  const rawUrl = process.env.OLLAMA_URL?.trim();
  if (!rawUrl) {
    throw new AppConfigError(
      "OLLAMA_URL is not configured. Add it to your .env file, for example OLLAMA_URL=\"http://127.0.0.1:11434\".",
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new AppConfigError(
      `OLLAMA_URL is invalid: "${rawUrl}". Use a full HTTP URL such as "http://127.0.0.1:11434".`,
    );
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new AppConfigError("OLLAMA_URL must use the http or https protocol.");
  }

  return parsed.toString().replace(/\/+$/, "");
}

export function getOllamaCallTimeoutMs(): number {
  const rawTimeout = process.env.OLLAMA_CALL_TIMEOUT?.trim();
  if (!rawTimeout) return DEFAULT_OLLAMA_CALL_TIMEOUT_MS;

  const timeout = Number(rawTimeout);
  if (!Number.isInteger(timeout) || timeout <= 0) {
    throw new AppConfigError(
      "OLLAMA_CALL_TIMEOUT must be a positive integer number of milliseconds.",
    );
  }

  return timeout;
}
