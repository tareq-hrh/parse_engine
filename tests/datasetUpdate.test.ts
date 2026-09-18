import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  dataset: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  datasetInput: {
    count: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

import { updateDataset, UpdateDatasetError } from "@/lib/datasetUpdate";

describe("updateDataset", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    prismaMock.dataset.findUnique.mockResolvedValue({ id: "dataset-1" });
    prismaMock.dataset.update.mockResolvedValue({
      id: "dataset-1",
      name: "Updated invoices",
      slug: "invoices",
      description: "Reviewed invoice samples",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    });
    prismaMock.datasetInput.count.mockResolvedValue(4);
  });

  it("updates dataset metadata while keeping the slug stable", async () => {
    await expect(
      updateDataset({
        datasetSlug: " invoices ",
        name: "Updated invoices",
        description: "Reviewed invoice samples",
      }),
    ).resolves.toMatchObject({
      id: "dataset-1",
      name: "Updated invoices",
      slug: "invoices",
      description: "Reviewed invoice samples",
      inputCount: 4,
    });

    expect(prismaMock.dataset.findUnique).toHaveBeenCalledWith({
      where: { slug: "invoices" },
      select: { id: true },
    });
    expect(prismaMock.dataset.update).toHaveBeenCalledWith({
      where: { id: "dataset-1" },
      data: {
        name: "Updated invoices",
        description: "Reviewed invoice samples",
      },
    });
    expect(prismaMock.datasetInput.count).toHaveBeenCalledWith({
      where: { datasetId: "dataset-1" },
    });
  });

  it("clears the description when null is provided", async () => {
    await updateDataset({
      datasetSlug: "invoices",
      name: "Updated invoices",
      description: null,
    });

    expect(prismaMock.dataset.update).toHaveBeenCalledWith({
      where: { id: "dataset-1" },
      data: {
        name: "Updated invoices",
        description: null,
      },
    });
  });

  it("rejects an empty dataset slug", async () => {
    await expect(
      updateDataset({
        datasetSlug: "   ",
        name: "Updated invoices",
        description: null,
      }),
    ).rejects.toMatchObject({
      status: 400,
    } satisfies Partial<UpdateDatasetError>);

    expect(prismaMock.dataset.findUnique).not.toHaveBeenCalled();
  });

  it("rejects missing datasets", async () => {
    prismaMock.dataset.findUnique.mockResolvedValue(null);

    await expect(
      updateDataset({
        datasetSlug: "missing-dataset",
        name: "Updated invoices",
        description: null,
      }),
    ).rejects.toMatchObject({
      status: 404,
    } satisfies Partial<UpdateDatasetError>);

    expect(prismaMock.dataset.update).not.toHaveBeenCalled();
  });

  it("rejects duplicate dataset names", async () => {
    prismaMock.dataset.update.mockRejectedValue({ code: "P2002" });

    await expect(
      updateDataset({
        datasetSlug: "invoices",
        name: "Existing dataset",
        description: null,
      }),
    ).rejects.toMatchObject({
      message: "A dataset with this name already exists.",
      status: 409,
    } satisfies Partial<UpdateDatasetError>);

    expect(prismaMock.datasetInput.count).not.toHaveBeenCalled();
  });
});
