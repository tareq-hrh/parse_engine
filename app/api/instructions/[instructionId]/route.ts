import { NextResponse } from "next/server";
import { deleteInstruction, isDeleteInstructionError } from "@/lib/instructionDelete";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ instructionId: string }> },
) {
  try {
    const { instructionId } = await params;
    const result = await deleteInstruction(instructionId);

    return NextResponse.json(
      {
        message: `Deleted "${result.title}".`,
        ...result,
      },
      { status: 200 },
    );
  } catch (error) {
    if (isDeleteInstructionError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("❌ Failed to delete instruction:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
