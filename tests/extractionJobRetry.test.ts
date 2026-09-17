import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  extractionJob: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
  },
  extractionResult: {
    deleteMany: vi.fn(),
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
  clearFailedResultsForRetry,
  RetryFailedResultsError,
} from "@/lib/extractionJobRetry";

describe("clearFailedResultsForRetry", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    runtimeMock.getActiveExtractionJobId.mockReturnValue(null);
    prismaMock.extractionJob.findUnique.mockResolvedValue({
      id: "job-1",
      datasetId: "dataset-1",
      isRunning: false,
    });
    prismaMock.extractionJob.findFirst.mockResolvedValue(null);
    prismaMock.extractionResult.deleteMany.mockResolvedValue({ count: 2 });
    prismaMock.extractionResult.count
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(0);
    prismaMock.datasetInput.count.mockResolvedValue(5);
  });

  it("deletes only failed results and returns refreshed counts", async () => {
    await expect(clearFailedResultsForRetry(" job-1 ")).resolves.toEqual({
      extractionJobId: "job-1",
      deletedFailedResultCount: 2,
      successfulResultCount: 3,
      failedResultCount: 0,
      totalInputCount: 5,
    });

    expect(prismaMock.extractionResult.deleteMany).toHaveBeenCalledWith({
      where: { extractionJobId: "job-1", status: "failed" },
    });
  });

  it("rejects while any extraction job is active", async () => {
    runtimeMock.getActiveExtractionJobId.mockReturnValue("job-1");

    await expect(clearFailedResultsForRetry("job-1")).rejects.toMatchObject({
      status: 409,
    } satisfies Partial<RetryFailedResultsError>);

    expect(prismaMock.extractionJob.findUnique).not.toHaveBeenCalled();
  });

  it("rejects missing extraction jobs", async () => {
    prismaMock.extractionJob.findUnique.mockResolvedValue(null);

    await expect(clearFailedResultsForRetry("missing-job")).rejects.toMatchObject({
      status: 404,
    } satisfies Partial<RetryFailedResultsError>);
  });

  it("rejects jobs still marked as running", async () => {
    prismaMock.extractionJob.findUnique.mockResolvedValue({
      id: "job-1",
      datasetId: "dataset-1",
      isRunning: true,
    });

    await expect(clearFailedResultsForRetry("job-1")).rejects.toMatchObject({
      status: 409,
    } satisfies Partial<RetryFailedResultsError>);
  });
});
