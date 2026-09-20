import type { ExtractionJob, ExtractionResult } from "@/components/extraction-job/types";
import { prisma, Prisma } from "@/lib/prisma";
import { toModelOptions, toUsageMetrics } from "@/lib/prismaHelpers";

const extractionJobInclude = {
  instruction: {
    select: { id: true, title: true, prompt: true, outputSchema: true },
  },
  dataset: {
    select: { id: true, name: true, slug: true },
  },
} satisfies Prisma.ExtractionJobInclude;

type ExtractionJobRecord = Prisma.ExtractionJobGetPayload<{
  include: typeof extractionJobInclude;
}>;

type ExtractionResultRecord = Prisma.ExtractionResultGetPayload<Record<string, never>>;

export interface ExtractionJobResultsSnapshot {
  extractionJobId: string;
  successfulResultCount: number;
  failedResultCount: number;
  job: ExtractionJob;
  successfulResults: ExtractionResult[];
  failedResults: ExtractionResult[];
}

function toIsoString(value: Date | string | null): string | null {
  if (value === null) return null;
  if (typeof value === "string") return value;
  return value.toISOString();
}

function shapeExtractionResult(result: ExtractionResultRecord): ExtractionResult {
  const {
    totalDuration,
    loadDuration,
    promptEvalCount,
    promptEvalDuration,
    evalCount,
    evalDuration,
    processedAt,
    createdAt,
    updatedAt: _updatedAt,
    renderedPrompt: _renderedPrompt,
    rawResponse: _rawResponse,
    ...rest
  } = result;

  const extractedData = rest.extractedData as unknown;

  return {
    ...rest,
    status: rest.status === "failed" ? "failed" : "success",
    inputLabel: rest.inputLabel ?? "",
    processedAt: processedAt.toISOString(),
    createdAt: createdAt.toISOString(),
    extractedData:
      extractedData === Prisma.DbNull || extractedData === null
        ? null
        : (extractedData as ExtractionResult["extractedData"]),
    usageMetrics: toUsageMetrics({
      totalDuration,
      loadDuration,
      promptEvalCount,
      promptEvalDuration,
      evalCount,
      evalDuration,
    }),
  };
}

async function attachExtractionJobCounts(job: ExtractionJobRecord): Promise<ExtractionJob> {
  const [successfulResultCount, failedResultCount, totalInputCount] = await Promise.all([
    prisma.extractionResult.count({ where: { extractionJobId: job.id, status: "success" } }),
    prisma.extractionResult.count({ where: { extractionJobId: job.id, status: "failed" } }),
    prisma.datasetInput.count({ where: { datasetId: job.datasetId } }),
  ]);

  const { instruction, dataset, temperature, numCtx, think, ...rest } = job;

  return {
    ...rest,
    startedAt: toIsoString(rest.startedAt),
    finishedAt: toIsoString(rest.finishedAt),
    createdAt: rest.createdAt.toISOString(),
    updatedAt: rest.updatedAt.toISOString(),
    instruction: {
      ...instruction,
      outputSchema: instruction.outputSchema as ExtractionJob["instruction"]["outputSchema"],
    },
    dataset,
    modelOptions: toModelOptions({ temperature, numCtx, think }),
    successfulResultCount,
    failedResultCount,
    totalInputCount,
  };
}

export async function getExtractionJobSnapshots(): Promise<ExtractionJob[]> {
  const extractionJobs = await prisma.extractionJob.findMany({
    orderBy: { createdAt: "desc" },
    include: extractionJobInclude,
  });

  return Promise.all(extractionJobs.map(attachExtractionJobCounts));
}

export async function getExtractionJobSnapshot(
  extractionJobId: string,
): Promise<ExtractionJob | null> {
  const job = await prisma.extractionJob.findUnique({
    where: { id: extractionJobId },
    include: extractionJobInclude,
  });

  if (!job) return null;

  return attachExtractionJobCounts(job);
}

export async function getExtractionJobResultsSnapshot(
  extractionJobId: string,
): Promise<ExtractionJobResultsSnapshot | null> {
  const job = await getExtractionJobSnapshot(extractionJobId);

  if (!job) return null;

  const [rawSuccessfulResults, rawFailedResults] = await Promise.all([
    prisma.extractionResult.findMany({
      where: { extractionJobId, status: "success" },
      orderBy: { createdAt: "desc" },
    }),
    prisma.extractionResult.findMany({
      where: { extractionJobId, status: "failed" },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const successfulResults = rawSuccessfulResults.map(shapeExtractionResult);
  const failedResults = rawFailedResults.map(shapeExtractionResult);

  return {
    extractionJobId,
    successfulResultCount: successfulResults.length,
    failedResultCount: failedResults.length,
    job,
    successfulResults,
    failedResults,
  };
}
