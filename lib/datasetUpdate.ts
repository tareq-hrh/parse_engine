import { prisma } from "@/lib/prisma";

export class UpdateDatasetError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "UpdateDatasetError";
    this.status = status;
  }
}

export function isUpdateDatasetError(error: unknown): error is UpdateDatasetError {
  return error instanceof UpdateDatasetError;
}

export interface UpdateDatasetInput {
  datasetSlug: string;
  name: string;
  description: string | null;
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "P2002"
  );
}

export async function updateDataset({ datasetSlug, name, description }: UpdateDatasetInput) {
  const slug = datasetSlug.trim();

  if (!slug) {
    throw new UpdateDatasetError("Dataset slug is required.", 400);
  }

  const dataset = await prisma.dataset.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!dataset) {
    throw new UpdateDatasetError("Dataset not found.", 404);
  }

  try {
    const updated = await prisma.dataset.update({
      where: { id: dataset.id },
      data: {
        name,
        description,
      },
    });

    const inputCount = await prisma.datasetInput.count({
      where: { datasetId: updated.id },
    });

    return { ...updated, inputCount };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new UpdateDatasetError("A dataset with this name already exists.", 409);
    }

    throw error;
  }
}
