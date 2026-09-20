import { NextResponse } from "next/server";
import { getExtractionJobResultsSnapshot } from "@/lib/extractionJobSnapshots";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const { jobId } = await params;

    const snapshot = await getExtractionJobResultsSnapshot(jobId);
    if (!snapshot) {
      return NextResponse.json({ error: "Extraction job not found." }, { status: 404 });
    }

    return NextResponse.json(snapshot, { status: 200 });
  } catch (error) {
    console.error("❌ Failed to fetch extraction results:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
