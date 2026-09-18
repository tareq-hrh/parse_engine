import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteDatasetInput, isDeleteDatasetInputError } from "@/lib/datasetInputDelete";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ inputId: string }> },
) {
  try {
    const { inputId } = await params;
    const input = await prisma.datasetInput.findUnique({ where: { id: inputId } });

    if (!input) {
      return NextResponse.json({ error: "Dataset input not found." }, { status: 404 });
    }

    return NextResponse.json(input, { status: 200 });
  } catch (error) {
    console.error("❌ Failed to fetch dataset input:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ inputId: string }> },
) {
  try {
    const { inputId } = await params;
    const result = await deleteDatasetInput(inputId);

    return NextResponse.json(
      {
        message: `Deleted "${result.label}".`,
        ...result,
      },
      { status: 200 },
    );
  } catch (error) {
    if (isDeleteDatasetInputError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("❌ Failed to delete dataset input:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
