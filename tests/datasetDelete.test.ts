import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn(),
  dataset: {
    findUnique: vi.fn(),
    delete: vi.fn(),
  },
  datasetInput: {
    deleteMany: vi.fn(),
  },
  extractionJob: {
    count: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

import { deleteDataset, DeleteDatasetError } from "@/lib/datasetDelete";

describe("deleteDataset", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    prismaMock.dataset.findUnique.mockResolvedValue({
      id: "dataset-1",
      slug: "invoices",
      name: "Invoices",
    });
    prismaMock.extractionJob.count.mockResolvedValue(0);
    prismaMock.datasetInput.deleteMany.mockResolvedValue({ count: 3 });
    prismaMock.dataset.delete.mockResolvedValue({ id: "dataset-1" });
    prismaMock.$transaction.mockImplementation(
      async (callback: (tx: typeof prismaMock) => Promise<unknown>) => callback(prismaMock),
    );
  });

  it("deletes dataset inputs and the dataset in a transaction", async () => {
    await expect(deleteDataset(" invoices ")).resolves.toEqual({
      datasetId: "dataset-1",
      datasetSlug: "invoices",
      name: "Invoices",
      deletedInputCount: 3,
      referencingJobCount: 0,
    });

    expect(prismaMock.dataset.findUnique).toHaveBeenCalledWith({
      where: { slug: "invoices" },
      select: { id: true, slug: true, name: true },
    });
    expect(prismaMock.extractionJob.count).toHaveBeenCalledWith({
      where: { datasetId: "dataset-1" },
    });
    expect(prismaMock.$transaction).toHaveBeenCalledOnce();
    expect(prismaMock.datasetInput.deleteMany).toHaveBeenCalledWith({
      where: { datasetId: "dataset-1" },
    });
    expect(prismaMock.dataset.delete).toHaveBeenCalledWith({
      where: { id: "dataset-1" },
    });
  });

  it("rejects an empty dataset slug", async () => {
    await expect(deleteDataset("   ")).rejects.toMatchObject({
      status: 400,
    } satisfies Partial<DeleteDatasetError>);

    expect(prismaMock.dataset.findUnique).not.toHaveBeenCalled();
  });

  it("rejects missing datasets", async () => {
    prismaMock.dataset.findUnique.mockResolvedValue(null);

    await expect(deleteDataset("missing-dataset")).rejects.toMatchObject({
      status: 404,
    } satisfies Partial<DeleteDatasetError>);

    expect(prismaMock.extractionJob.count).not.toHaveBeenCalled();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("rejects datasets referenced by extraction jobs", async () => {
    prismaMock.extractionJob.count.mockResolvedValue(2);

    await expect(deleteDataset("invoices")).rejects.toMatchObject({
      message: "This dataset is used by 2 extraction jobs. Delete those jobs first.",
      status: 409,
    } satisfies Partial<DeleteDatasetError>);

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(prismaMock.dataset.delete).not.toHaveBeenCalled();
  });
});
