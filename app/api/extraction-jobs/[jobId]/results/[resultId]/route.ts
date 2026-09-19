import { NextResponse } from "next/server";
import {
  deleteExtractionResult,
  isDeleteExtractionResultError,
} from "@/lib/extractionResultDelete";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ jobId: string; resultId: string }> },
) {
  try {
    const { jobId, resultId } = await params;
    const result = await deleteExtractionResult({
      extractionJobId: jobId,
      extractionResultId: resultId,
    });

    return NextResponse.json(
      {
        message: `Deleted result for "${result.inputLabel ?? "unknown input"}".`,
        ...result,
      },
      { status: 200 },
    );
  } catch (error) {
    if (isDeleteExtractionResultError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Failed to delete extraction result:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
