import { describe, expect, it } from "vitest";
import { ApiValidationError } from "@/lib/apiValidation";
import { readModelOptions } from "@/lib/extractionJobContracts";

describe("extractionJobContracts", () => {
  it("defaults missing model options", () => {
    expect(readModelOptions(undefined)).toEqual({ temperature: 0 });
  });

  it("normalizes valid model options", () => {
    expect(readModelOptions({ temperature: 2.2, num_ctx: 2_000_000, think: "medium" })).toEqual({
      temperature: 2.2,
      num_ctx: 2_000_000,
      think: "medium",
    });
  });

  it("accepts boolean thinking options", () => {
    expect(readModelOptions({ think: true })).toEqual({ temperature: 0, think: true });
  });

  it("rejects malformed temperature, context, and think values", () => {
    expect(() => readModelOptions({ temperature: -0.1 })).toThrow(ApiValidationError);
    expect(() => readModelOptions({ num_ctx: 2.5 })).toThrow(ApiValidationError);
    expect(() => readModelOptions({ think: "extreme" })).toThrow(ApiValidationError);
  });
});
