import { NextRequest, NextResponse } from "next/server";
import { prisma, Prisma } from "@/lib/prisma";
import {
  isApiValidationError,
  readJsonObject,
  readOptionalPlainObject,
  readRequiredTrimmedString,
} from "@/lib/apiValidation";

export async function GET() {
  try {
    const instructions = await prisma.instruction.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(instructions, { status: 200 });
  } catch (error) {
    console.error("❌ Failed to fetch instructions:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await readJsonObject(req);
    const title = readRequiredTrimmedString(body.title, "Instruction title");
    const prompt = readRequiredTrimmedString(body.prompt, "Prompt template");
    const outputSchema = readOptionalPlainObject(body.outputSchema, "outputSchema");

    const created = await prisma.instruction.create({
      data: {
        title,
        prompt,
        outputSchema:
          outputSchema !== undefined
            ? (outputSchema as unknown as Prisma.InputJsonObject)
            : Prisma.DbNull,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (isApiValidationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("❌ Failed to create instruction:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
