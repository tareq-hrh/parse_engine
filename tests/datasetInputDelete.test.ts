import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  datasetInput: {
    findUnique: vi.fn(),
    delete: vi.fn(),
  },
  extractionJob: {
    findFirst: vi.fn(),
  },
  extractionResult: {
    count: vi.fn(),
  },
}));

const runtimeMock = vi.hoisted(() => ({
  getActiveExtractionJobId: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/extractionJobRuntimeState", () => runtimeMock);

import { deleteDatasetInput, DeleteDatasetInputError } from "@/lib/datasetInputDelete";

describe("deleteDatasetInput", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    runtimeMock.getActiveExtractionJobId.mockReturnValue(null);
    prismaMock.datasetInput.findUnique.mockResolvedValue({
      id: "input-1",
      datasetId: "dataset-1",
      label: "invoice-001.txt",
    });
    prismaMock.extractionJob.findFirst.mockResolvedValue(null);
    prismaMock.extractionResult.count.mockResolvedValue(0);
    prismaMock.datasetInput.delete.mockResolvedValue({ id: "input-1" });
  });

  it("deletes an input that is not referenced by extraction results", async () => {
    await expect(deleteDatasetInput(" input-1 ")).resolves.toEqual({
      datasetInputId: "input-1",
      datasetId: "dataset-1",
      label: "invoice-001.txt",
      referencingResultCount: 0,
    });

    expect(prismaMock.datasetInput.findUnique).toHaveBeenCalledWith({
      where: { id: "input-1" },
      select: { id: true, datasetId: true, label: true },
    });
    expect(prismaMock.extractionResult.count).toHaveBeenCalledWith({
      where: { datasetInputId: "input-1" },
    });
    expect(prismaMock.datasetInput.delete).toHaveBeenCalledWith({
      where: { id: "input-1" },
    });
  });

  it("rejects an empty input id", async () => {
    await expect(deleteDatasetInput("   ")).rejects.toMatchObject({
      status: 400,
    } satisfies Partial<DeleteDatasetInputError>);

    expect(prismaMock.datasetInput.findUnique).not.toHaveBeenCalled();
  });

  it("rejects while any extraction job is active in memory", async () => {
    runtimeMock.getActiveExtractionJobId.mockReturnValue("job-1");

    await expect(deleteDatasetInput("input-1")).rejects.toMatchObject({
      status: 409,
    } satisfies Partial<DeleteDatasetInputError>);

    expect(prismaMock.datasetInput.findUnique).not.toHaveBeenCalled();
  });

  it("rejects missing inputs", async () => {
    prismaMock.datasetInput.findUnique.mockResolvedValue(null);

    await expect(deleteDatasetInput("missing-input")).rejects.toMatchObject({
      status: 404,
    } satisfies Partial<DeleteDatasetInputError>);

    expect(prismaMock.extractionResult.count).not.toHaveBeenCalled();
    expect(prismaMock.datasetInput.delete).not.toHaveBeenCalled();
  });

  it("rejects while any extraction job is marked as running in the database", async () => {
    prismaMock.extractionJob.findFirst.mockResolvedValue({ id: "job-1" });

    await expect(deleteDatasetInput("input-1")).rejects.toMatchObject({
      status: 409,
    } satisfies Partial<DeleteDatasetInputError>);

    expect(prismaMock.extractionResult.count).not.toHaveBeenCalled();
    expect(prismaMock.datasetInput.delete).not.toHaveBeenCalled();
  });

  it("rejects inputs referenced by extraction results", async () => {
    prismaMock.extractionResult.count.mockResolvedValue(2);

    await expect(deleteDatasetInput("input-1")).rejects.toMatchObject({
      message: "This input is used by 2 extraction results. Delete related extraction jobs first.",
      status: 409,
    } satisfies Partial<DeleteDatasetInputError>);

    expect(prismaMock.datasetInput.delete).not.toHaveBeenCalled();
  });
});
