import { NextRequest, NextResponse } from "next/server";
import { deleteDataset, isDeleteDatasetError } from "@/lib/datasetDelete";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;

    const dataset = await prisma.dataset.findUnique({ where: { slug } });

    if (!dataset) {
      return NextResponse.json({ error: "Dataset not found." }, { status: 404 });
    }

    const inputCount = await prisma.datasetInput.count({
      where: { datasetId: dataset.id },
    });

    return NextResponse.json({ ...dataset, inputCount }, { status: 200 });
  } catch (error) {
    console.error("❌ Failed to fetch dataset:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const result = await deleteDataset(slug);

    return NextResponse.json(
      {
        message: `Deleted "${result.name}" and ${result.deletedInputCount} input${
          result.deletedInputCount === 1 ? "" : "s"
        }.`,
        ...result,
      },
      { status: 200 },
    );
  } catch (error) {
    if (isDeleteDatasetError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("❌ Failed to delete dataset:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
