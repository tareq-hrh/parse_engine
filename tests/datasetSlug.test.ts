import { describe, expect, it } from "vitest";
import { generateDatasetSlug } from "@/lib/datasetSlug";

describe("generateDatasetSlug", () => {
  it("matches the server/client dataset slug contract", () => {
    expect(generateDatasetSlug(" Invoice Batch 2025! ")).toBe("invoice-batch-2025");
    expect(generateDatasetSlug("Quarterly Report")).toBe("quarterly-report");
  });

  it("returns an empty slug when a name has no slug-safe content", () => {
    expect(generateDatasetSlug("!!!")).toBe("");
  });
});
