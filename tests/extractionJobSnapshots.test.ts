import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  extractionJob: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  extractionResult: {
    count: vi.fn(),
    findMany: vi.fn(),
  },
  datasetInput: {
    count: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
  Prisma: {
    DbNull: Symbol("DbNull"),
  },
}));

import {
  getExtractionJobResultsSnapshot,
  getExtractionJobSnapshot,
  getExtractionJobSnapshots,
} from "@/lib/extractionJobSnapshots";

const createdAt = new Date("2026-09-20T08:00:00.000Z");
const updatedAt = new Date("2026-09-20T08:05:00.000Z");
const startedAt = new Date("2026-09-20T08:01:00.000Z");

function jobRecord(patch: Record<string, unknown> = {}) {
  return {
    id: "job-1",
    title: "Invoice extraction",
    modelName: "gemma3",
    instructionId: "instruction-1",
    datasetId: "dataset-1",
    temperature: 0.2,
    numCtx: 8192,
    think: "medium",
    isRunning: true,
    startedAt,
    finishedAt: null,
    totalProcessingTimeSeconds: 12,
    lastSuccessfulInputLabel: "invoice-001.txt",
    currentInputLabel: "invoice-002.txt",
    createdAt,
    updatedAt,
    instruction: {
      id: "instruction-1",
      title: "Invoice fields",
      prompt: "Extract invoice data",
      outputSchema: { type: "object" },
    },
    dataset: {
      id: "dataset-1",
      name: "Invoices",
      slug: "invoices",
    },
    ...patch,
  };
}

function resultRecord(patch: Record<string, unknown> = {}) {
  return {
    id: "result-1",
    inputLabel: "invoice-001.txt",
    contentHash: "hash-1",
    extractionJobId: "job-1",
    datasetInputId: "input-1",
    processedAt: new Date("2026-09-20T08:02:00.000Z"),
    processingDurationSeconds: 4,
    status: "success",
    extractedData: { invoiceNumber: "INV-001" },
    errorMessage: null,
    renderedPrompt: "prompt",
    rawResponse: "{\"invoiceNumber\":\"INV-001\"}",
    totalDuration: 100,
    loadDuration: 10,
    promptEvalCount: 20,
    promptEvalDuration: 30,
    evalCount: 40,
    evalDuration: 50,
    createdAt: new Date("2026-09-20T08:02:00.000Z"),
    updatedAt: new Date("2026-09-20T08:02:01.000Z"),
    ...patch,
  };
}

describe("extraction job snapshots", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    prismaMock.extractionResult.count.mockResolvedValueOnce(2).mockResolvedValueOnce(1);
    prismaMock.datasetInput.count.mockResolvedValue(5);
  });

  it("serializes job list records with counts and frontend fields", async () => {
    prismaMock.extractionJob.findMany.mockResolvedValue([jobRecord()]);

    await expect(getExtractionJobSnapshots()).resolves.toEqual([
      expect.objectContaining({
        id: "job-1",
        startedAt: "2026-09-20T08:01:00.000Z",
        finishedAt: null,
        createdAt: "2026-09-20T08:00:00.000Z",
        updatedAt: "2026-09-20T08:05:00.000Z",
        modelOptions: { temperature: 0.2, num_ctx: 8192, think: "medium" },
        successfulResultCount: 2,
        failedResultCount: 1,
        totalInputCount: 5,
      }),
    ]);

    expect(prismaMock.extractionJob.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: "desc" },
      include: expect.any(Object),
    });
  });

  it("returns null for a missing single job", async () => {
    prismaMock.extractionJob.findUnique.mockResolvedValue(null);

    await expect(getExtractionJobSnapshot("missing-job")).resolves.toBeNull();
  });

  it("returns a selected-job result snapshot with the canonical job", async () => {
    prismaMock.extractionJob.findUnique.mockResolvedValue(jobRecord({ isRunning: false }));
    prismaMock.extractionResult.findMany
      .mockResolvedValueOnce([resultRecord()])
      .mockResolvedValueOnce([resultRecord({
        id: "result-2",
        status: "failed",
        extractedData: null,
        errorMessage: "Model failed",
        totalDuration: null,
      })]);

    await expect(getExtractionJobResultsSnapshot("job-1")).resolves.toMatchObject({
      extractionJobId: "job-1",
      successfulResultCount: 1,
      failedResultCount: 1,
      job: {
        id: "job-1",
        successfulResultCount: 2,
        failedResultCount: 1,
        totalInputCount: 5,
      },
      successfulResults: [
        {
          id: "result-1",
          processedAt: "2026-09-20T08:02:00.000Z",
          createdAt: "2026-09-20T08:02:00.000Z",
          status: "success",
          extractedData: { invoiceNumber: "INV-001" },
          usageMetrics: {
            totalDuration: 100,
            loadDuration: 10,
            promptEvalCount: 20,
            promptEvalDuration: 30,
            evalCount: 40,
            evalDuration: 50,
          },
        },
      ],
      failedResults: [
        {
          id: "result-2",
          status: "failed",
          extractedData: null,
          usageMetrics: null,
        },
      ],
    });
  });
});
