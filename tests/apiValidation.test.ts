import { describe, expect, it } from "vitest";
import {
  ApiValidationError,
  readBoundedIntegerSearchParam,
  readOptionalBoundedNumber,
  readOptionalPlainObject,
  readOptionalTrimmedString,
  readRequiredTrimmedString,
} from "@/lib/apiValidation";

describe("apiValidation", () => {
  it("reads and trims required strings", () => {
    expect(readRequiredTrimmedString("  Dataset  ", "Dataset name")).toBe("Dataset");
  });

  it("rejects empty required strings", () => {
    expect(() => readRequiredTrimmedString(" ", "Dataset name")).toThrow(ApiValidationError);
    expect(readOptionalTrimmedString("  long local description  ", "Description")).toBe(
      "long local description",
    );
  });

  it("accepts plain JSON objects and rejects arrays", () => {
    expect(readOptionalPlainObject({ type: "object" }, "outputSchema")).toEqual({
      type: "object",
    });
    expect(() => readOptionalPlainObject([], "outputSchema")).toThrow(ApiValidationError);
  });

  it("validates bounded numeric fields", () => {
    expect(readOptionalBoundedNumber(2.4, "temperature", { min: 0 })).toBe(2.4);
    expect(() => readOptionalBoundedNumber(-0.1, "temperature", { min: 0 })).toThrow(
      ApiValidationError,
    );
    expect(() => readOptionalBoundedNumber(2.5, "num_ctx", { integer: true })).toThrow(
      ApiValidationError,
    );
  });

  it("normalizes bounded integer search params", () => {
    expect(
      readBoundedIntegerSearchParam(new URLSearchParams("page=3"), "page", 1, {
        min: 1,
        max: 5,
      }),
    ).toBe(3);
    expect(
      readBoundedIntegerSearchParam(new URLSearchParams("page=bad"), "page", 1, {
        min: 1,
        max: 5,
      }),
    ).toBe(1);
    expect(
      readBoundedIntegerSearchParam(new URLSearchParams("page=99"), "page", 1, {
        min: 1,
        max: 5,
      }),
    ).toBe(5);
  });
});
