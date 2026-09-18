import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  instruction: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}));

const prismaSentinels = vi.hoisted(() => ({
  DbNull: Symbol("DbNull"),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
  Prisma: prismaSentinels,
}));

import { updateInstruction, UpdateInstructionError } from "@/lib/instructionUpdate";

describe("updateInstruction", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    prismaMock.instruction.findUnique.mockResolvedValue({ id: "instruction-1" });
    prismaMock.instruction.update.mockResolvedValue({
      id: "instruction-1",
      title: "Updated invoice schema",
      prompt: "Extract invoice data from {INPUT_TEXT}",
      outputSchema: { type: "object" },
    });
  });

  it("updates an existing instruction", async () => {
    const outputSchema = { type: "object", properties: { vendor: { type: "string" } } };

    await expect(
      updateInstruction({
        instructionId: " instruction-1 ",
        title: "Updated invoice schema",
        prompt: "Extract invoice data from {INPUT_TEXT}",
        outputSchema,
      }),
    ).resolves.toMatchObject({
      id: "instruction-1",
      title: "Updated invoice schema",
    });

    expect(prismaMock.instruction.findUnique).toHaveBeenCalledWith({
      where: { id: "instruction-1" },
      select: { id: true },
    });
    expect(prismaMock.instruction.update).toHaveBeenCalledWith({
      where: { id: "instruction-1" },
      data: {
        title: "Updated invoice schema",
        prompt: "Extract invoice data from {INPUT_TEXT}",
        outputSchema,
      },
    });
  });

  it("clears the output schema when null is provided", async () => {
    await updateInstruction({
      instructionId: "instruction-1",
      title: "No schema",
      prompt: "Extract text",
      outputSchema: null,
    });

    expect(prismaMock.instruction.update).toHaveBeenCalledWith({
      where: { id: "instruction-1" },
      data: {
        title: "No schema",
        prompt: "Extract text",
        outputSchema: prismaSentinels.DbNull,
      },
    });
  });

  it("rejects an empty instruction id", async () => {
    await expect(
      updateInstruction({
        instructionId: "   ",
        title: "Updated",
        prompt: "Prompt",
        outputSchema: null,
      }),
    ).rejects.toMatchObject({
      status: 400,
    } satisfies Partial<UpdateInstructionError>);

    expect(prismaMock.instruction.findUnique).not.toHaveBeenCalled();
  });

  it("rejects missing instructions", async () => {
    prismaMock.instruction.findUnique.mockResolvedValue(null);

    await expect(
      updateInstruction({
        instructionId: "missing-instruction",
        title: "Updated",
        prompt: "Prompt",
        outputSchema: null,
      }),
    ).rejects.toMatchObject({
      status: 404,
    } satisfies Partial<UpdateInstructionError>);

    expect(prismaMock.instruction.update).not.toHaveBeenCalled();
  });
});
