import { describe, expect, it } from "vitest";
import { serializeThink, toModelOptions, toUsageMetrics } from "@/lib/prismaHelpers";

describe("prismaHelpers", () => {
  it("converts flat extraction-job model option columns to frontend options", () => {
    expect(toModelOptions({ temperature: 0.2, numCtx: 8192, think: "true" })).toEqual({
      temperature: 0.2,
      num_ctx: 8192,
      think: true,
    });
    expect(toModelOptions({ temperature: 0, numCtx: null, think: "medium" })).toEqual({
      temperature: 0,
      think: "medium",
    });
    expect(toModelOptions({ temperature: 0, numCtx: null, think: null })).toEqual({
      temperature: 0,
    });
  });

  it("serializes think options for flat persistence", () => {
    expect(serializeThink(undefined)).toBeNull();
    expect(serializeThink(null)).toBeNull();
    expect(serializeThink(true)).toBe("true");
    expect(serializeThink(false)).toBe("false");
    expect(serializeThink("high")).toBe("high");
  });

  it("converts flat result usage columns to frontend metrics", () => {
    expect(
      toUsageMetrics({
        totalDuration: 100,
        loadDuration: 10,
        promptEvalCount: 20,
        promptEvalDuration: 30,
        evalCount: 40,
        evalDuration: 50,
      }),
    ).toEqual({
      totalDuration: 100,
      loadDuration: 10,
      promptEvalCount: 20,
      promptEvalDuration: 30,
      evalCount: 40,
      evalDuration: 50,
    });
  });

  it("returns null usage metrics when total duration is absent", () => {
    expect(
      toUsageMetrics({
        totalDuration: null,
        loadDuration: null,
        promptEvalCount: null,
        promptEvalDuration: null,
        evalCount: null,
        evalDuration: null,
      }),
    ).toBeNull();
  });
});
