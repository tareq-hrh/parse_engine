import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  instruction: {
    findUnique: vi.fn(),
    delete: vi.fn(),
  },
  extractionJob: {
    count: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

import { deleteInstruction, DeleteInstructionError } from "@/lib/instructionDelete";

describe("deleteInstruction", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    prismaMock.instruction.findUnique.mockResolvedValue({
      id: "instruction-1",
      title: "Invoice schema",
    });
    prismaMock.extractionJob.count.mockResolvedValue(0);
    prismaMock.instruction.delete.mockResolvedValue({ id: "instruction-1" });
  });

  it("deletes an instruction that is not used by extraction jobs", async () => {
    await expect(deleteInstruction(" instruction-1 ")).resolves.toEqual({
      instructionId: "instruction-1",
      title: "Invoice schema",
      referencingJobCount: 0,
    });

    expect(prismaMock.instruction.findUnique).toHaveBeenCalledWith({
      where: { id: "instruction-1" },
      select: { id: true, title: true },
    });
    expect(prismaMock.extractionJob.count).toHaveBeenCalledWith({
      where: { instructionId: "instruction-1" },
    });
    expect(prismaMock.instruction.delete).toHaveBeenCalledWith({
      where: { id: "instruction-1" },
    });
  });

  it("rejects an empty instruction id", async () => {
    await expect(deleteInstruction("   ")).rejects.toMatchObject({
      status: 400,
    } satisfies Partial<DeleteInstructionError>);

    expect(prismaMock.instruction.findUnique).not.toHaveBeenCalled();
  });

  it("rejects missing instructions", async () => {
    prismaMock.instruction.findUnique.mockResolvedValue(null);

    await expect(deleteInstruction("missing-instruction")).rejects.toMatchObject({
      status: 404,
    } satisfies Partial<DeleteInstructionError>);

    expect(prismaMock.extractionJob.count).not.toHaveBeenCalled();
    expect(prismaMock.instruction.delete).not.toHaveBeenCalled();
  });

  it("rejects instructions referenced by extraction jobs", async () => {
    prismaMock.extractionJob.count.mockResolvedValue(2);

    await expect(deleteInstruction("instruction-1")).rejects.toMatchObject({
      message: "This instruction is used by 2 extraction jobs. Delete those jobs first.",
      status: 409,
    } satisfies Partial<DeleteInstructionError>);

    expect(prismaMock.instruction.delete).not.toHaveBeenCalled();
  });
});
