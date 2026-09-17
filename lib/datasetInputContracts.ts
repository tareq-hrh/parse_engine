import { ApiValidationError, isPlainObject } from "./apiValidation";

export const INGESTION_METHODS = ["file_upload", "manual_entry", "api"] as const;

export type IngestionMethod = (typeof INGESTION_METHODS)[number];

export interface InputItem {
  label: string;
  content: string;
}

export interface DuplicateRecord {
  submittedLabel: string;
  existingLabel: string;
  reason: "duplicate_content" | "duplicate_label";
}

export interface InputIngestionResult {
  added: number;
  skipped: number;
  duplicates: DuplicateRecord[];
}

export function isIngestionMethod(value: unknown): value is IngestionMethod {
  return typeof value === "string" && INGESTION_METHODS.includes(value as IngestionMethod);
}

export function validateInputItems(value: unknown): InputItem[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new ApiValidationError("inputs must be a non-empty array.");
  }

  return value.map((item, index) => {
    if (!isPlainObject(item)) {
      throw new ApiValidationError(`inputs[${index}] must be a JSON object.`);
    }

    const { label, content } = item;

    if (typeof label !== "string") {
      throw new ApiValidationError(`inputs[${index}].label must be a string.`);
    }

    if (typeof content !== "string") {
      throw new ApiValidationError(`inputs[${index}].content must be a string.`);
    }

    const trimmedLabel = label.trim();
    const trimmedContent = content.trim();

    return {
      label: trimmedLabel,
      content: trimmedContent,
    };
  });
}
