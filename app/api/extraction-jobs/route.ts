import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toModelOptions, serializeThink } from "@/lib/prismaHelpers";
import {
  isApiValidationError,
  readJsonObject,
  readOptionalTrimmedString,
  readRequiredTrimmedString,
} from "@/lib/apiValidation";
import { readModelOptions } from "@/lib/extractionJobContracts";

export async function GET() {
  try {
    const extractionJobs = await prisma.extractionJob.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        instruction: {
          select: { id: true, title: true, prompt: true, outputSchema: true },
        },
        dataset: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    const jobsWithCounts = await Promise.all(
      extractionJobs.map(async (job) => {
        const [successfulResultCount, failedResultCount, totalInputCount] = await Promise.all([
          prisma.extractionResult.count({ where: { extractionJobId: job.id, status: "success" } }),
          prisma.extractionResult.count({ where: { extractionJobId: job.id, status: "failed" } }),
          prisma.datasetInput.count({ where: { datasetId: job.datasetId } }),
        ]);

        const { instruction, dataset, temperature, numCtx, think, ...rest } = job;
        return {
          ...rest,
          instruction,
          dataset,
          modelOptions: toModelOptions({ temperature, numCtx, think }),
          successfulResultCount,
          failedResultCount,
          totalInputCount,
        };
      }),
    );

    return NextResponse.json(jobsWithCounts, { status: 200 });
  } catch (error) {
    console.error("❌ Failed to fetch extraction jobs:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await readJsonObject(req);
    const title = readOptionalTrimmedString(body.title, "Job title");
    const modelName = readRequiredTrimmedString(body.modelName, "Ollama model name");
    const instructionId = readRequiredTrimmedString(body.instructionId, "Instruction ID");
    const datasetId = readRequiredTrimmedString(body.datasetId, "Dataset ID");
    const modelOptions = readModelOptions(body.modelOptions);

    const instruction = await prisma.instruction.findUnique({ where: { id: instructionId } });
    if (!instruction) {
      return NextResponse.json(
        { error: "Instruction not found. Please select a valid instruction." },
        { status: 404 },
      );
    }

    const dataset = await prisma.dataset.findUnique({ where: { id: datasetId } });
    if (!dataset) {
      return NextResponse.json(
        { error: "Dataset not found. Please select a valid dataset." },
        { status: 404 },
      );
    }

    const finalTitle = title || `${modelName} - ${instruction.title}`;

    const created = await prisma.extractionJob.create({
      data: {
        title: finalTitle,
        modelName,
        instructionId,
        datasetId,
        temperature: modelOptions.temperature,
        numCtx: modelOptions.num_ctx ?? null,
        think: serializeThink(modelOptions.think ?? null),
      },
      include: {
        instruction: { select: { id: true, title: true, prompt: true, outputSchema: true } },
        dataset: { select: { id: true, name: true, slug: true } },
      },
    });

    const totalInputCount = await prisma.datasetInput.count({ where: { datasetId } });
    const {
      instruction: createdInstruction,
      dataset: createdDataset,
      temperature,
      numCtx,
      think,
      ...rest
    } = created;

    return NextResponse.json(
      {
        ...rest,
        instruction: createdInstruction,
        dataset: createdDataset,
        modelOptions: toModelOptions({ temperature, numCtx, think }),
        successfulResultCount: 0,
        failedResultCount: 0,
        totalInputCount,
      },
      { status: 201 },
    );
  } catch (error) {
    if (isApiValidationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("❌ Failed to create extraction job:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
