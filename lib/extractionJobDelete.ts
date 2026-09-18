import { prisma } from "@/lib/prisma";
import { getActiveExtractionJobId } from "@/lib/extractionJobRuntimeState";

export class DeleteExtractionJobError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "DeleteExtractionJobError";
    this.status = status;
  }
}

export function isDeleteExtractionJobError(error: unknown): error is DeleteExtractionJobError {
  return error instanceof DeleteExtractionJobError;
}

export interface DeleteExtractionJobResult {
  extractionJobId: string;
  title: string;
  deletedResultCount: number;
}

export async function deleteExtractionJob(
  extractionJobId: string,
): Promise<DeleteExtractionJobResult> {
  const jobId = extractionJobId.trim();

  if (!jobId) {
    throw new DeleteExtractionJobError("Extraction job ID is required.", 400);
  }

  const activeJobId = getActiveExtractionJobId();
  if (activeJobId) {
    throw new DeleteExtractionJobError(
      "An extraction job is currently active. Stop it before deleting a job.",
      409,
    );
  }

  const extractionJob = await prisma.extractionJob.findUnique({
    where: { id: jobId },
    select: { id: true, title: true, isRunning: true },
  });

  if (!extractionJob) {
    throw new DeleteExtractionJobError("Extraction job not found.", 404);
  }

  if (extractionJob.isRunning) {
    throw new DeleteExtractionJobError("Stop this extraction job before deleting it.", 409);
  }

  const runningJob = await prisma.extractionJob.findFirst({
    where: { isRunning: true },
    select: { id: true },
  });

  if (runningJob) {
    throw new DeleteExtractionJobError(
      "Another extraction job is running. Stop it before deleting a job.",
      409,
    );
  }

  const deletedResultCount = await prisma.$transaction(async (tx) => {
    const deletedResults = await tx.extractionResult.deleteMany({
      where: { extractionJobId: jobId },
    });

    await tx.extractionJob.delete({
      where: { id: jobId },
    });

    return deletedResults.count;
  });

  return {
    extractionJobId: jobId,
    title: extractionJob.title,
    deletedResultCount,
  };
}
