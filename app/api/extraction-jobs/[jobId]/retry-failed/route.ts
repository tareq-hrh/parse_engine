import { NextResponse } from "next/server";
import {
  clearFailedResultsForRetry,
  isRetryFailedResultsError,
} from "@/lib/extractionJobRetry";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const { jobId } = await params;
    const result = await clearFailedResultsForRetry(jobId);

    return NextResponse.json(
      {
        message:
          result.deletedFailedResultCount === 1
            ? "Cleared 1 failed result. Click Start to retry it."
            : `Cleared ${result.deletedFailedResultCount} failed results. Click Start to retry them.`,
        ...result,
      },
      { status: 200 },
    );
  } catch (error) {
    if (isRetryFailedResultsError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("❌ Failed to clear failed extraction results:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
