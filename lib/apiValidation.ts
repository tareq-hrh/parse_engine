export class ApiValidationError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "ApiValidationError";
    this.status = status;
  }
}

export function isApiValidationError(error: unknown): error is ApiValidationError {
  return error instanceof ApiValidationError;
}

export interface JsonBodyRequest {
  json(): Promise<unknown>;
}

export async function readJsonObject(req: JsonBodyRequest): Promise<Record<string, unknown>> {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    throw new ApiValidationError("Request body must be valid JSON.");
  }

  if (!isPlainObject(body)) {
    throw new ApiValidationError("Request body must be a JSON object.");
  }

  return body;
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function readRequiredTrimmedString(value: unknown, fieldLabel: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ApiValidationError(`${fieldLabel} is required.`);
  }

  return value.trim();
}

export function readOptionalTrimmedString(
  value: unknown,
  fieldLabel: string,
): string | undefined {
  if (value === undefined || value === null) return undefined;

  if (typeof value !== "string") {
    throw new ApiValidationError(`${fieldLabel} must be a string.`);
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;

  return trimmed;
}

export function readOptionalPlainObject(
  value: unknown,
  fieldLabel: string,
): Record<string, unknown> | undefined {
  if (value === undefined || value === null) return undefined;

  if (!isPlainObject(value)) {
    throw new ApiValidationError(`${fieldLabel} must be a JSON object.`);
  }

  return value;
}

export function readOptionalBoundedNumber(
  value: unknown,
  fieldLabel: string,
  options: { min?: number; max?: number; integer?: boolean } = {},
): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;

  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ApiValidationError(`${fieldLabel} must be a number.`);
  }

  if (options.integer && !Number.isInteger(value)) {
    throw new ApiValidationError(`${fieldLabel} must be an integer.`);
  }

  if (options.min !== undefined && value < options.min) {
    throw new ApiValidationError(`${fieldLabel} must be at least ${options.min}.`);
  }

  if (options.max !== undefined && value > options.max) {
    throw new ApiValidationError(`${fieldLabel} cannot be greater than ${options.max}.`);
  }

  return value;
}

export function readBoundedIntegerSearchParam(
  searchParams: URLSearchParams,
  name: string,
  defaultValue: number,
  options: { min: number; max: number },
): number {
  const raw = searchParams.get(name);
  if (raw === null || raw.trim() === "") return defaultValue;

  const parsed = Number(raw);
  if (!Number.isInteger(parsed)) return defaultValue;

  return Math.min(options.max, Math.max(options.min, parsed));
}
