import { NextRequest, NextResponse } from "next/server";
import { isApiValidationError, readJsonObject } from "@/lib/apiValidation";
import { ingestDatasetInputs } from "@/lib/datasetInputIngestion";

/**
 * Core input ingestion endpoint.
 *
 * Body:
 * {
 *   datasetId: string,
 *   ingestionMethod: "file_upload" | "manual_entry" | "api",
 *   inputs: [{ label: string, content: string }]
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await readJsonObject(req);
    const result = await ingestDatasetInputs({
      datasetId: body.datasetId,
      ingestionMethod: body.ingestionMethod,
      inputs: body.inputs,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (isApiValidationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("❌ Failed to add dataset inputs:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
