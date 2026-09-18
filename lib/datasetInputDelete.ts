import { prisma } from "@/lib/prisma";
import { getActiveExtractionJobId } from "@/lib/extractionJobRuntimeState";

export class DeleteDatasetInputError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "DeleteDatasetInputError";
    this.status = status;
  }
}

export function isDeleteDatasetInputError(error: unknown): error is DeleteDatasetInputError {
  return error instanceof DeleteDatasetInputError;
}

export interface DeleteDatasetInputResult {
  datasetInputId: string;
  datasetId: string;
  label: string;
  referencingResultCount: number;
}

export async function deleteDatasetInput(
  datasetInputId: string,
): Promise<DeleteDatasetInputResult> {
  const inputId = datasetInputId.trim();

  if (!inputId) {
    throw new DeleteDatasetInputError("Dataset input ID is required.", 400);
  }

  const activeJobId = getActiveExtractionJobId();
  if (activeJobId) {
    throw new DeleteDatasetInputError(
      "An extraction job is currently active. Stop it before deleting dataset inputs.",
      409,
    );
  }

  const input = await prisma.datasetInput.findUnique({
    where: { id: inputId },
    select: { id: true, datasetId: true, label: true },
  });

  if (!input) {
    throw new DeleteDatasetInputError("Dataset input not found.", 404);
  }

  const runningJob = await prisma.extractionJob.findFirst({
    where: { isRunning: true },
    select: { id: true },
  });

  if (runningJob) {
    throw new DeleteDatasetInputError(
      "Another extraction job is running. Stop it before deleting dataset inputs.",
      409,
    );
  }

  const referencingResultCount = await prisma.extractionResult.count({
    where: { datasetInputId: inputId },
  });

  if (referencingResultCount > 0) {
    throw new DeleteDatasetInputError(
      `This input is used by ${referencingResultCount} extraction result${
        referencingResultCount === 1 ? "" : "s"
      }. Delete related extraction jobs first.`,
      409,
    );
  }

  await prisma.datasetInput.delete({
    where: { id: inputId },
  });

  return {
    datasetInputId: inputId,
    datasetId: input.datasetId,
    label: input.label,
    referencingResultCount,
  };
}
