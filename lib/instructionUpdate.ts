import { prisma, Prisma } from "@/lib/prisma";

export class UpdateInstructionError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "UpdateInstructionError";
    this.status = status;
  }
}

export function isUpdateInstructionError(error: unknown): error is UpdateInstructionError {
  return error instanceof UpdateInstructionError;
}

export interface UpdateInstructionInput {
  instructionId: string;
  title: string;
  prompt: string;
  outputSchema: Record<string, unknown> | null;
}

export async function updateInstruction({
  instructionId,
  title,
  prompt,
  outputSchema,
}: UpdateInstructionInput) {
  const id = instructionId.trim();

  if (!id) {
    throw new UpdateInstructionError("Instruction ID is required.", 400);
  }

  const instruction = await prisma.instruction.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!instruction) {
    throw new UpdateInstructionError("Instruction not found.", 404);
  }

  return prisma.instruction.update({
    where: { id },
    data: {
      title,
      prompt,
      outputSchema:
        outputSchema !== null
          ? (outputSchema as unknown as Prisma.InputJsonObject)
          : Prisma.DbNull,
    },
  });
}
