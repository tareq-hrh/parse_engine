import { describe, expect, it } from "vitest";
import { getJobStatus } from "@/components/extraction-job/utils";
import type { ExtractionJob } from "@/components/extraction-job/types";

function job(patch: Partial<ExtractionJob>): ExtractionJob {
  return {
    id: "job-1",
    title: "Job",
    modelName: "llama",
    instructionId: "instruction-1",
    datasetId: "dataset-1",
    instruction: {
      id: "instruction-1",
      title: "Instruction",
      prompt: "Extract data",
      outputSchema: null,
    },
    dataset: {
      id: "dataset-1",
      name: "Dataset",
      slug: "dataset",
    },
    modelOptions: { temperature: 0 },
    isRunning: false,
    startedAt: null,
    finishedAt: null,
    totalProcessingTimeSeconds: 0,
    successfulResultCount: 0,
    failedResultCount: 0,
    totalInputCount: 0,
    lastSuccessfulInputLabel: null,
    currentInputLabel: null,
    createdAt: "2026-09-17T00:00:00.000Z",
    updatedAt: "2026-09-17T00:00:00.000Z",
    ...patch,
  };
}

describe("getJobStatus", () => {
  it("returns running when the job is marked running", () => {
    expect(getJobStatus(job({ isRunning: true }))).toBe("running");
  });

  it("returns completed only when a finished job has all inputs accounted for", () => {
    expect(
      getJobStatus(
        job({
          finishedAt: "2026-09-17T01:00:00.000Z",
          totalInputCount: 3,
          successfulResultCount: 2,
          failedResultCount: 1,
        }),
      ),
    ).toBe("completed");
  });

  it("returns pending before start, after stop, or after new inputs are added", () => {
    expect(getJobStatus(job({ totalInputCount: 3 }))).toBe("pending");
    expect(
      getJobStatus(
        job({
          finishedAt: "2026-09-17T01:00:00.000Z",
          totalInputCount: 3,
          successfulResultCount: 1,
          failedResultCount: 1,
        }),
      ),
    ).toBe("pending");
    expect(
      getJobStatus(
        job({
          finishedAt: "2026-09-17T01:00:00.000Z",
          totalInputCount: 4,
          successfulResultCount: 2,
          failedResultCount: 1,
        }),
      ),
    ).toBe("pending");
  });

  it("does not mark empty finished jobs as completed", () => {
    expect(getJobStatus(job({ finishedAt: "2026-09-17T01:00:00.000Z" }))).toBe("pending");
  });
});
