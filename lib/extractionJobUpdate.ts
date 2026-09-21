import { prisma } from "@/lib/prisma";
import { getExtractionJobSnapshot } from "@/lib/extractionJobSnapshots";

export class UpdateExtractionJobError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "UpdateExtractionJobError";
    this.status = status;
  }
}

export function isUpdateExtractionJobError(error: unknown): error is UpdateExtractionJobError {
  return error instanceof UpdateExtractionJobError;
}

export interface UpdateExtractionJobTitleInput {
  extractionJobId: string;
  title: string;
}

export async function updateExtractionJobTitle({
  extractionJobId,
  title,
}: UpdateExtractionJobTitleInput) {
  const id = extractionJobId.trim();

  if (!id) {
    throw new UpdateExtractionJobError("Extraction job ID is required.", 400);
  }

  const extractionJob = await prisma.extractionJob.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!extractionJob) {
    throw new UpdateExtractionJobError("Extraction job not found.", 404);
  }

  await prisma.extractionJob.update({
    where: { id },
    data: { title },
  });

  const updatedSnapshot = await getExtractionJobSnapshot(id);
  if (!updatedSnapshot) {
    throw new UpdateExtractionJobError("Extraction job not found.", 404);
  }

  return updatedSnapshot;
}
