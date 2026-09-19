import { prisma } from "@/lib/prisma";
import { getActiveExtractionJobId } from "@/lib/extractionJobRuntimeState";

export class DeleteExtractionResultError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "DeleteExtractionResultError";
    this.status = status;
  }
}

export function isDeleteExtractionResultError(
  error: unknown,
): error is DeleteExtractionResultError {
  return error instanceof DeleteExtractionResultError;
}

export interface DeleteExtractionResultInput {
  extractionJobId: string;
  extractionResultId: string;
}

export interface DeleteExtractionResultResult {
  extractionJobId: string;
  extractionResultId: string;
  inputLabel: string | null;
  status: string;
  successfulResultCount: number;
  failedResultCount: number;
  totalInputCount: number;
}

export async function deleteExtractionResult({
  extractionJobId,
  extractionResultId,
}: DeleteExtractionResultInput): Promise<DeleteExtractionResultResult> {
  const jobId = extractionJobId.trim();
  const resultId = extractionResultId.trim();

  if (!jobId) {
    throw new DeleteExtractionResultError("Extraction job ID is required.", 400);
  }
  if (!resultId) {
    throw new DeleteExtractionResultError("Extraction result ID is required.", 400);
  }

  const activeJobId = getActiveExtractionJobId();
  if (activeJobId) {
    throw new DeleteExtractionResultError(
      "An extraction job is currently active. Stop it before deleting results.",
      409,
    );
  }

  const extractionJob = await prisma.extractionJob.findUnique({
    where: { id: jobId },
    select: { id: true, datasetId: true, isRunning: true },
  });

  if (!extractionJob) {
    throw new DeleteExtractionResultError("Extraction job not found.", 404);
  }

  if (extractionJob.isRunning) {
    throw new DeleteExtractionResultError(
      "Stop this extraction job before deleting results.",
      409,
    );
  }

  const runningJob = await prisma.extractionJob.findFirst({
    where: { isRunning: true },
    select: { id: true },
  });

  if (runningJob) {
    throw new DeleteExtractionResultError(
      "Another extraction job is running. Stop it before deleting results.",
      409,
    );
  }

  const extractionResult = await prisma.extractionResult.findFirst({
    where: { id: resultId, extractionJobId: jobId },
    select: { id: true, inputLabel: true, status: true },
  });

  if (!extractionResult) {
    throw new DeleteExtractionResultError("Extraction result not found for this job.", 404);
  }

  return prisma.$transaction(async (tx) => {
    await tx.extractionResult.delete({
      where: { id: resultId },
    });

    const [successfulResultCount, failedResultCount, totalInputCount] = await Promise.all([
      tx.extractionResult.count({ where: { extractionJobId: jobId, status: "success" } }),
      tx.extractionResult.count({ where: { extractionJobId: jobId, status: "failed" } }),
      tx.datasetInput.count({ where: { datasetId: extractionJob.datasetId } }),
    ]);

    return {
      extractionJobId: jobId,
      extractionResultId: resultId,
      inputLabel: extractionResult.inputLabel,
      status: extractionResult.status,
      successfulResultCount,
      failedResultCount,
      totalInputCount,
    };
  });
}
