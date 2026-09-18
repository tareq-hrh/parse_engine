import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn(),
  extractionJob: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    delete: vi.fn(),
  },
  extractionResult: {
    deleteMany: vi.fn(),
  },
}));

const runtimeMock = vi.hoisted(() => ({
  getActiveExtractionJobId: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/extractionJobRuntimeState", () => runtimeMock);

import { deleteExtractionJob, DeleteExtractionJobError } from "@/lib/extractionJobDelete";

describe("deleteExtractionJob", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    runtimeMock.getActiveExtractionJobId.mockReturnValue(null);
    prismaMock.extractionJob.findUnique.mockResolvedValue({
      id: "job-1",
      title: "Invoice extraction",
      isRunning: false,
    });
    prismaMock.extractionJob.findFirst.mockResolvedValue(null);
    prismaMock.extractionResult.deleteMany.mockResolvedValue({ count: 7 });
    prismaMock.extractionJob.delete.mockResolvedValue({ id: "job-1" });
    prismaMock.$transaction.mockImplementation(
      async (callback: (tx: typeof prismaMock) => Promise<unknown>) => callback(prismaMock),
    );
  });

  it("deletes extraction results and the extraction job in a transaction", async () => {
    await expect(deleteExtractionJob(" job-1 ")).resolves.toEqual({
      extractionJobId: "job-1",
      title: "Invoice extraction",
      deletedResultCount: 7,
    });

    expect(prismaMock.$transaction).toHaveBeenCalledOnce();
    expect(prismaMock.extractionResult.deleteMany).toHaveBeenCalledWith({
      where: { extractionJobId: "job-1" },
    });
    expect(prismaMock.extractionJob.delete).toHaveBeenCalledWith({
      where: { id: "job-1" },
    });
  });

  it("rejects while any extraction job is active", async () => {
    runtimeMock.getActiveExtractionJobId.mockReturnValue("job-1");

    await expect(deleteExtractionJob("job-1")).rejects.toMatchObject({
      status: 409,
    } satisfies Partial<DeleteExtractionJobError>);

    expect(prismaMock.extractionJob.findUnique).not.toHaveBeenCalled();
  });

  it("rejects missing extraction jobs", async () => {
    prismaMock.extractionJob.findUnique.mockResolvedValue(null);

    await expect(deleteExtractionJob("missing-job")).rejects.toMatchObject({
      status: 404,
    } satisfies Partial<DeleteExtractionJobError>);
  });

  it("rejects jobs still marked as running", async () => {
    prismaMock.extractionJob.findUnique.mockResolvedValue({
      id: "job-1",
      title: "Invoice extraction",
      isRunning: true,
    });

    await expect(deleteExtractionJob("job-1")).rejects.toMatchObject({
      status: 409,
    } satisfies Partial<DeleteExtractionJobError>);
  });
});
