import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  isApiValidationError,
  readBoundedIntegerSearchParam,
  readJsonObject,
} from "@/lib/apiValidation";
import { ingestDatasetInputs } from "@/lib/datasetInputIngestion";

const DEFAULT_PAGE_SIZE = 20;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const dataset = await prisma.dataset.findUnique({ where: { slug } });

    if (!dataset) {
      return NextResponse.json({ error: "Dataset not found." }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const page = readBoundedIntegerSearchParam(searchParams, "page", 1, { min: 1, max: 10_000 });
    const limit = readBoundedIntegerSearchParam(searchParams, "limit", DEFAULT_PAGE_SIZE, {
      min: 1,
      max: 100,
    });
    const skip = (page - 1) * limit;

    const [inputs, total] = await Promise.all([
      prisma.datasetInput.findMany({
        where: { datasetId: dataset.id },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          datasetId: true,
          label: true,
          contentHash: true,
          ingestionMethod: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.datasetInput.count({ where: { datasetId: dataset.id } }),
    ]);

    return NextResponse.json(
      {
        inputs: inputs,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("❌ Failed to fetch dataset inputs:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

/**
 * Programmatic endpoint for adding inputs through a dataset slug.
 * The ingestion method is always "api" for this route.
 *
 * Body:
 * {
 *   inputs: [{ label: string, content: string }]
 * }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const body = await readJsonObject(req);

    const dataset = await prisma.dataset.findUnique({ where: { slug } });
    if (!dataset) {
      return NextResponse.json(
        { error: `Dataset with slug "${slug}" not found.` },
        { status: 404 },
      );
    }

    const result = await ingestDatasetInputs({
      datasetId: dataset.id,
      ingestionMethod: "api",
      inputs: body.inputs,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (isApiValidationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("❌ Failed to add inputs through dataset slug:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
