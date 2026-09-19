import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn(),
  extractionJob: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
  },
  extractionResult: {
    findFirst: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  datasetInput: {
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

import {
  deleteExtractionResult,
  DeleteExtractionResultError,
} from "@/lib/extractionResultDelete";

describe("deleteExtractionResult", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    runtimeMock.getActiveExtractionJobId.mockReturnValue(null);
    prismaMock.extractionJob.findUnique.mockResolvedValue({
      id: "job-1",
      datasetId: "dataset-1",
      isRunning: false,
    });
    prismaMock.extractionJob.findFirst.mockResolvedValue(null);
    prismaMock.extractionResult.findFirst.mockResolvedValue({
      id: "result-1",
      inputLabel: "input-001.txt",
      status: "failed",
    });
    prismaMock.extractionResult.delete.mockResolvedValue({ id: "result-1" });
    prismaMock.extractionResult.count.mockResolvedValueOnce(3).mockResolvedValueOnce(1);
    prismaMock.datasetInput.count.mockResolvedValue(5);
    prismaMock.$transaction.mockImplementation(
      async (callback: (tx: typeof prismaMock) => Promise<unknown>) => callback(prismaMock),
    );
  });

  it("deletes one extraction result and returns refreshed counts", async () => {
    await expect(
      deleteExtractionResult({
        extractionJobId: " job-1 ",
        extractionResultId: " result-1 ",
      }),
    ).resolves.toEqual({
      extractionJobId: "job-1",
      extractionResultId: "result-1",
      inputLabel: "input-001.txt",
      status: "failed",
      successfulResultCount: 3,
      failedResultCount: 1,
      totalInputCount: 5,
    });

    expect(prismaMock.extractionResult.findFirst).toHaveBeenCalledWith({
      where: { id: "result-1", extractionJobId: "job-1" },
      select: { id: true, inputLabel: true, status: true },
    });
    expect(prismaMock.extractionResult.delete).toHaveBeenCalledWith({
      where: { id: "result-1" },
    });
    expect(prismaMock.extractionResult.count).toHaveBeenNthCalledWith(1, {
      where: { extractionJobId: "job-1", status: "success" },
    });
    expect(prismaMock.extractionResult.count).toHaveBeenNthCalledWith(2, {
      where: { extractionJobId: "job-1", status: "failed" },
    });
  });

  it("rejects while any extraction job is active in memory", async () => {
    runtimeMock.getActiveExtractionJobId.mockReturnValue("job-1");

    await expect(
      deleteExtractionResult({ extractionJobId: "job-1", extractionResultId: "result-1" }),
    ).rejects.toMatchObject({
      status: 409,
    } satisfies Partial<DeleteExtractionResultError>);

    expect(prismaMock.extractionJob.findUnique).not.toHaveBeenCalled();
  });

  it("rejects missing extraction jobs", async () => {
    prismaMock.extractionJob.findUnique.mockResolvedValue(null);

    await expect(
      deleteExtractionResult({ extractionJobId: "missing-job", extractionResultId: "result-1" }),
    ).rejects.toMatchObject({
      status: 404,
    } satisfies Partial<DeleteExtractionResultError>);
  });

  it("rejects jobs still marked as running", async () => {
    prismaMock.extractionJob.findUnique.mockResolvedValue({
      id: "job-1",
      datasetId: "dataset-1",
      isRunning: true,
    });

    await expect(
      deleteExtractionResult({ extractionJobId: "job-1", extractionResultId: "result-1" }),
    ).rejects.toMatchObject({
      status: 409,
    } satisfies Partial<DeleteExtractionResultError>);
  });

  it("rejects when another job is running in the database", async () => {
    prismaMock.extractionJob.findFirst.mockResolvedValue({ id: "job-2" });

    await expect(
      deleteExtractionResult({ extractionJobId: "job-1", extractionResultId: "result-1" }),
    ).rejects.toMatchObject({
      status: 409,
    } satisfies Partial<DeleteExtractionResultError>);

    expect(prismaMock.extractionResult.findFirst).not.toHaveBeenCalled();
  });

  it("rejects missing results for the selected job", async () => {
    prismaMock.extractionResult.findFirst.mockResolvedValue(null);

    await expect(
      deleteExtractionResult({ extractionJobId: "job-1", extractionResultId: "missing-result" }),
    ).rejects.toMatchObject({
      status: 404,
    } satisfies Partial<DeleteExtractionResultError>);

    expect(prismaMock.extractionResult.delete).not.toHaveBeenCalled();
  });
});
