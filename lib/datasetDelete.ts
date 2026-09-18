import { prisma } from "@/lib/prisma";

export class DeleteDatasetError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "DeleteDatasetError";
    this.status = status;
  }
}

export function isDeleteDatasetError(error: unknown): error is DeleteDatasetError {
  return error instanceof DeleteDatasetError;
}

export interface DeleteDatasetResult {
  datasetId: string;
  datasetSlug: string;
  name: string;
  deletedInputCount: number;
  referencingJobCount: number;
}

export async function deleteDataset(datasetSlug: string): Promise<DeleteDatasetResult> {
  const slug = datasetSlug.trim();

  if (!slug) {
    throw new DeleteDatasetError("Dataset slug is required.", 400);
  }

  const dataset = await prisma.dataset.findUnique({
    where: { slug },
    select: { id: true, slug: true, name: true },
  });

  if (!dataset) {
    throw new DeleteDatasetError("Dataset not found.", 404);
  }

  const referencingJobCount = await prisma.extractionJob.count({
    where: { datasetId: dataset.id },
  });

  if (referencingJobCount > 0) {
    throw new DeleteDatasetError(
      `This dataset is used by ${referencingJobCount} extraction job${
        referencingJobCount === 1 ? "" : "s"
      }. Delete those jobs first.`,
      409,
    );
  }

  const deletedInputCount = await prisma.$transaction(async (tx) => {
    const deletedInputs = await tx.datasetInput.deleteMany({
      where: { datasetId: dataset.id },
    });

    await tx.dataset.delete({
      where: { id: dataset.id },
    });

    return deletedInputs.count;
  });

  return {
    datasetId: dataset.id,
    datasetSlug: dataset.slug,
    name: dataset.name,
    deletedInputCount,
    referencingJobCount,
  };
}
