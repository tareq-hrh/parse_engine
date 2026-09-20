import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runExtractionJob } from "@/lib/extractionJobRunner";
import { checkOllamaHealth } from "@/lib/ollamaClient";
import { isAppConfigError } from "@/lib/env";
import { getExtractionJobSnapshot } from "@/lib/extractionJobSnapshots";
import {
  claimExtractionJobRun,
  getActiveExtractionJobId,
  releaseExtractionJobRun,
} from "@/lib/extractionJobRuntimeState";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const { jobId } = await params;

    if (!jobId?.trim()) {
      return NextResponse.json({ error: "Extraction job ID is required." }, { status: 400 });
    }

    const activeJobId = getActiveExtractionJobId();
    if (activeJobId) {
      return NextResponse.json(
        {
          error: "Another extraction job is already active. Stop it before starting a new one.",
          runningJobId: activeJobId,
        },
        { status: 409 },
      );
    }

    const alreadyRunning = await prisma.extractionJob.findFirst({
      where: { isRunning: true },
    });
    if (alreadyRunning) {
      return NextResponse.json(
        {
          error: "Another extraction job is already running. Stop it before starting a new one.",
          runningJobId: alreadyRunning.id,
        },
        { status: 409 },
      );
    }

    const extractionJob = await prisma.extractionJob.findUnique({ where: { id: jobId } });
    if (!extractionJob) {
      return NextResponse.json({ error: "Extraction job not found." }, { status: 404 });
    }

    const instruction = await prisma.instruction.findUnique({
      where: { id: extractionJob.instructionId },
    });
    if (!instruction) {
      return NextResponse.json(
        { error: "The linked instruction was not found. Select a valid instruction before starting the job." },
        { status: 400 },
      );
    }

    let ollamaHealthy = false;
    try {
      ollamaHealthy = await checkOllamaHealth();
    } catch (error) {
      if (isAppConfigError(error)) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      throw error;
    }

    if (!ollamaHealthy) {
      return NextResponse.json(
        { error: "Ollama is not running or cannot be reached. Please start Ollama and try again." },
        { status: 503 },
      );
    }

    if (!claimExtractionJobRun(jobId)) {
      return NextResponse.json(
        {
          error: "Another extraction job is already active. Stop it before starting a new one.",
          runningJobId: getActiveExtractionJobId(),
        },
        { status: 409 },
      );
    }

    try {
      // Mark as running before returning so API callers cannot start another job
      // while the background runner is still initializing.
      await prisma.extractionJob.update({
        where: { id: jobId },
        data: {
          isRunning: true,
          startedAt: extractionJob.startedAt ?? new Date(),
          finishedAt: null,
          currentInputLabel: null,
        },
      });
    } catch (error) {
      releaseExtractionJobRun(jobId);
      throw error;
    }

    const updatedJob = await getExtractionJobSnapshot(jobId);
    if (!updatedJob) {
      releaseExtractionJobRun(jobId);
      return NextResponse.json({ error: "Extraction job not found." }, { status: 404 });
    }

    runExtractionJob(jobId).catch((error) => {
      console.error("❌ Extraction job runner crashed unexpectedly:", error);
      releaseExtractionJobRun(jobId);
    });

    return NextResponse.json(
      {
        message: "Extraction job started successfully.",
        extractionJobId: jobId,
        title: extractionJob.title,
        modelName: extractionJob.modelName,
        instructionTitle: instruction.title,
        job: updatedJob,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("❌ Failed to start extraction job:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
