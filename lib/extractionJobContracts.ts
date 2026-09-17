import type { ModelOptions } from "@/components/extraction-job/types";
import {
  ApiValidationError,
  isPlainObject,
  readOptionalBoundedNumber,
} from "./apiValidation";

export const THINK_LEVELS = ["low", "medium", "high"] as const;

export function readModelOptions(value: unknown): ModelOptions {
  if (value === undefined || value === null) {
    return { temperature: 0 };
  }

  if (!isPlainObject(value)) {
    throw new ApiValidationError("modelOptions must be a JSON object.");
  }

  const temperature = readOptionalBoundedNumber(value.temperature, "modelOptions.temperature", {
    min: 0,
  });
  const numCtx = readOptionalBoundedNumber(value.num_ctx, "modelOptions.num_ctx", {
    min: 1,
    integer: true,
  });
  const think = readThinkOption(value.think);

  return {
    temperature: temperature ?? 0,
    ...(numCtx !== undefined && { num_ctx: numCtx }),
    ...(think !== undefined && { think }),
  };
}

function readThinkOption(value: unknown): ModelOptions["think"] | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value;

  if (typeof value === "string" && THINK_LEVELS.includes(value as (typeof THINK_LEVELS)[number])) {
    return value as (typeof THINK_LEVELS)[number];
  }

  throw new ApiValidationError(
    "modelOptions.think must be a boolean or one of: low, medium, high.",
  );
}
