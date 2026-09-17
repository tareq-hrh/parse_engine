import { describe, expect, it } from "vitest";
import { ApiValidationError } from "@/lib/apiValidation";
import { isIngestionMethod, validateInputItems } from "@/lib/datasetInputContracts";

describe("datasetInputContracts", () => {
  it("recognizes supported ingestion methods", () => {
    expect(isIngestionMethod("file_upload")).toBe(true);
    expect(isIngestionMethod("manual_entry")).toBe(true);
    expect(isIngestionMethod("api")).toBe(true);
    expect(isIngestionMethod("email")).toBe(false);
  });

  it("trims input labels and content before ingestion", () => {
    expect(validateInputItems([{ label: "  A  ", content: "  text  " }])).toEqual([
      { label: "A", content: "text" },
    ]);
  });

  it("preserves blank rows for the ingestion service to skip", () => {
    expect(validateInputItems([{ label: " ", content: "text" }])).toEqual([
      { label: "", content: "text" },
    ]);
  });

  it("allows large local batches through contract validation", () => {
    const inputs = Array.from({ length: 1_500 }, (_, index) => ({
      label: `Input ${index}`,
      content: "text",
    }));

    expect(validateInputItems(inputs)).toHaveLength(1_500);
  });

  it("allows large local content through contract validation", () => {
    expect(validateInputItems([{ label: "Large", content: "x".repeat(500_000) }])).toEqual([
      { label: "Large", content: "x".repeat(500_000) },
    ]);
  });

  it("rejects malformed input arrays and fields", () => {
    expect(() => validateInputItems([])).toThrow(ApiValidationError);
    expect(() => validateInputItems([null])).toThrow(ApiValidationError);
    expect(() => validateInputItems([{ label: 123, content: "text" }])).toThrow(
      ApiValidationError,
    );
    expect(() =>
      validateInputItems([{ label: "Input", content: { raw: "text" } }]),
    ).toThrow(ApiValidationError);
  });
});
