import { NextResponse } from "next/server";
import {
  isApiValidationError,
  readJsonObject,
  readRequiredTrimmedString,
} from "@/lib/apiValidation";
import { deleteExtractionJob, isDeleteExtractionJobError } from "@/lib/extractionJobDelete";
import {
  isUpdateExtractionJobError,
  updateExtractionJobTitle,
} from "@/lib/extractionJobUpdate";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const { jobId } = await params;
    const body = await readJsonObject(request);
    const title = readRequiredTrimmedString(body.title, "Job title");

    const result = await updateExtractionJobTitle({
      extractionJobId: jobId,
      title,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (isApiValidationError(error) || isUpdateExtractionJobError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("❌ Failed to update extraction job:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const { jobId } = await params;
    const result = await deleteExtractionJob(jobId);

    return NextResponse.json(
      {
        message: `Deleted "${result.title}" and ${result.deletedResultCount} result${
          result.deletedResultCount === 1 ? "" : "s"
        }.`,
        ...result,
      },
      { status: 200 },
    );
  } catch (error) {
    if (isDeleteExtractionJobError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("❌ Failed to delete extraction job:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
