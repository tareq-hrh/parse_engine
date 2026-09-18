import { NextResponse } from "next/server";
import {
  isApiValidationError,
  readJsonObject,
  readOptionalPlainObject,
  readRequiredTrimmedString,
} from "@/lib/apiValidation";
import { deleteInstruction, isDeleteInstructionError } from "@/lib/instructionDelete";
import { isUpdateInstructionError, updateInstruction } from "@/lib/instructionUpdate";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ instructionId: string }> },
) {
  try {
    const { instructionId } = await params;
    const body = await readJsonObject(request);
    const title = readRequiredTrimmedString(body.title, "Instruction title");
    const prompt = readRequiredTrimmedString(body.prompt, "Prompt template");
    const outputSchema = readOptionalPlainObject(body.outputSchema, "outputSchema") ?? null;

    const result = await updateInstruction({
      instructionId,
      title,
      prompt,
      outputSchema,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (isApiValidationError(error) || isUpdateInstructionError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("❌ Failed to update instruction:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

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
