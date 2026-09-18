import { prisma } from "@/lib/prisma";

export class DeleteInstructionError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "DeleteInstructionError";
    this.status = status;
  }
}

export function isDeleteInstructionError(error: unknown): error is DeleteInstructionError {
  return error instanceof DeleteInstructionError;
}

export interface DeleteInstructionResult {
  instructionId: string;
  title: string;
  referencingJobCount: number;
}

export async function deleteInstruction(
  instructionId: string,
): Promise<DeleteInstructionResult> {
  const id = instructionId.trim();

  if (!id) {
    throw new DeleteInstructionError("Instruction ID is required.", 400);
  }

  const instruction = await prisma.instruction.findUnique({
    where: { id },
    select: { id: true, title: true },
  });

  if (!instruction) {
    throw new DeleteInstructionError("Instruction not found.", 404);
  }

  const referencingJobCount = await prisma.extractionJob.count({
    where: { instructionId: id },
  });

  if (referencingJobCount > 0) {
    throw new DeleteInstructionError(
      `This instruction is used by ${referencingJobCount} extraction job${
        referencingJobCount === 1 ? "" : "s"
      }. Delete those jobs first.`,
      409,
    );
  }

  await prisma.instruction.delete({
    where: { id },
  });

  return {
    instructionId: id,
    title: instruction.title,
    referencingJobCount,
  };
}
