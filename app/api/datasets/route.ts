import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  isApiValidationError,
  readJsonObject,
  readOptionalTrimmedString,
  readRequiredTrimmedString,
} from "@/lib/apiValidation";
import { generateDatasetSlug } from "@/lib/datasetSlug";

export async function GET() {
  try {
    const datasets = await prisma.dataset.findMany({
      orderBy: { createdAt: "desc" },
    });

    const datasetsWithCounts = await Promise.all(
      datasets.map(async (dataset) => {
        const inputCount = await prisma.datasetInput.count({
          where: { datasetId: dataset.id },
        });
        return { ...dataset, inputCount };
      }),
    );

    return NextResponse.json(datasetsWithCounts, { status: 200 });
  } catch (error) {
    console.error("❌ Failed to fetch datasets:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await readJsonObject(req);
    const name = readRequiredTrimmedString(body.name, "Dataset name");
    const description = readOptionalTrimmedString(body.description, "Dataset description");

    const slug = generateDatasetSlug(name);

    if (!slug) {
      return NextResponse.json(
        { error: "Could not generate a valid slug from the provided name." },
        { status: 400 },
      );
    }

    try {
      const created = await prisma.dataset.create({
        data: {
          name,
          slug,
          ...(description && { description }),
        },
      });

      return NextResponse.json({ ...created, inputCount: 0 }, { status: 201 });
    } catch (dbError: unknown) {
      if (
        typeof dbError === "object" &&
        dbError !== null &&
        "code" in dbError &&
        (dbError as { code: string }).code === "P2002"
      ) {
        return NextResponse.json(
          { error: "A dataset with this name or slug already exists." },
          { status: 409 },
        );
      }
      throw dbError;
    }
  } catch (error) {
    if (isApiValidationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("❌ Failed to create dataset:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
