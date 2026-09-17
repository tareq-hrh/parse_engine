import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { ApiValidationError, readRequiredTrimmedString } from "./apiValidation";
import {
  INGESTION_METHODS,
  type InputIngestionResult,
  type IngestionMethod,
  isIngestionMethod,
  validateInputItems,
} from "./datasetInputContracts";

export function computeContentHash(content: string): string {
  return crypto.createHash("sha1").update(content, "utf8").digest("hex");
}

export async function ingestDatasetInputs({
  datasetId,
  ingestionMethod,
  inputs,
}: {
  datasetId: unknown;
  ingestionMethod: unknown;
  inputs: unknown;
}): Promise<InputIngestionResult> {
  const normalizedDatasetId = readRequiredTrimmedString(datasetId, "datasetId");

  if (!isIngestionMethod(ingestionMethod)) {
    throw new ApiValidationError(
      `ingestionMethod must be one of: ${INGESTION_METHODS.join(", ")}.`,
    );
  }

  const normalizedInputs = validateInputItems(inputs);

  const dataset = await prisma.dataset.findUnique({ where: { id: normalizedDatasetId } });
  if (!dataset) {
    throw new ApiValidationError("Dataset not found.", 404);
  }

  const existingRecords = await prisma.datasetInput.findMany({
    where: { datasetId: normalizedDatasetId },
    select: { contentHash: true, label: true },
  });

  const existingContentHashMap = new Map<string, string>(
    existingRecords.map((record) => [record.contentHash, record.label]),
  );
  const existingLabelMap = new Map<string, string>(
    existingRecords.map((record) => [record.label, record.label]),
  );

  const result: InputIngestionResult = {
    added: 0,
    skipped: 0,
    duplicates: [],
  };

  const inputsToCreate: {
    datasetId: string;
    label: string;
    content: string;
    contentHash: string;
    ingestionMethod: IngestionMethod;
  }[] = [];

  for (const input of normalizedInputs) {
    if (!input.label || !input.content) {
      result.skipped++;
      continue;
    }

    const contentHash = computeContentHash(input.content);

    if (existingContentHashMap.has(contentHash)) {
      result.skipped++;
      result.duplicates.push({
        submittedLabel: input.label,
        existingLabel: existingContentHashMap.get(contentHash)!,
        reason: "duplicate_content",
      });
      continue;
    }

    if (existingLabelMap.has(input.label)) {
      result.skipped++;
      result.duplicates.push({
        submittedLabel: input.label,
        existingLabel: existingLabelMap.get(input.label)!,
        reason: "duplicate_label",
      });
      continue;
    }

    existingContentHashMap.set(contentHash, input.label);
    existingLabelMap.set(input.label, input.label);

    inputsToCreate.push({
      datasetId: normalizedDatasetId,
      label: input.label,
      content: input.content,
      contentHash,
      ingestionMethod,
    });
  }

  if (inputsToCreate.length > 0) {
    await prisma.datasetInput.createMany({ data: inputsToCreate });
    result.added = inputsToCreate.length;
  }

  return result;
}
