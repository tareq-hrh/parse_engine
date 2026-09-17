import { prisma } from "@/lib/prisma";
import { getActiveExtractionJobId } from "@/lib/extractionJobRuntimeState";

export class RetryFailedResultsError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "RetryFailedResultsError";
    this.status = status;
  }
}

export function isRetryFailedResultsError(error: unknown): error is RetryFailedResultsError {
  return error instanceof RetryFailedResultsError;
}

export interface ClearFailedResultsForRetryResult {
  extractionJobId: string;
  deletedFailedResultCount: number;
  successfulResultCount: number;
  failedResultCount: number;
  totalInputCount: number;
}

export async function clearFailedResultsForRetry(
  extractionJobId: string,
): Promise<ClearFailedResultsForRetryResult> {
  const jobId = extractionJobId.trim();

  if (!jobId) {
    throw new RetryFailedResultsError("Extraction job ID is required.", 400);
  }

  const activeJobId = getActiveExtractionJobId();
  if (activeJobId) {
    throw new RetryFailedResultsError(
      "An extraction job is currently active. Stop it before clearing failed results.",
      409,
    );
  }

  const extractionJob = await prisma.extractionJob.findUnique({ where: { id: jobId } });
  if (!extractionJob) {
    throw new RetryFailedResultsError("Extraction job not found.", 404);
  }

  if (extractionJob.isRunning) {
    throw new RetryFailedResultsError(
      "Stop this extraction job before clearing failed results.",
      409,
    );
  }

  const runningJob = await prisma.extractionJob.findFirst({
    where: { isRunning: true },
    select: { id: true },
  });
  if (runningJob) {
    throw new RetryFailedResultsError(
      "Another extraction job is running. Stop it before clearing failed results.",
      409,
    );
  }

  const deleted = await prisma.extractionResult.deleteMany({
    where: { extractionJobId: jobId, status: "failed" },
  });

  const [successfulResultCount, failedResultCount, totalInputCount] = await Promise.all([
    prisma.extractionResult.count({ where: { extractionJobId: jobId, status: "success" } }),
    prisma.extractionResult.count({ where: { extractionJobId: jobId, status: "failed" } }),
    prisma.datasetInput.count({ where: { datasetId: extractionJob.datasetId } }),
  ]);

  return {
    extractionJobId: jobId,
    deletedFailedResultCount: deleted.count,
    successfulResultCount,
    failedResultCount,
    totalInputCount,
  };
}
