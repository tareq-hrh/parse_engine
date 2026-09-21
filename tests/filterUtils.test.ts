import { describe, expect, it } from "vitest";
import {
  computeFacets,
  matchesFilters,
  type FilterState,
} from "@/components/features/extraction-jobs/filters/filterUtils";
import type { ExtractionResult, ExtractedData } from "@/components/features/extraction-jobs/types";

function result(id: string, extractedData: ExtractedData | null): ExtractionResult {
  return {
    id,
    datasetInputId: `input-${id}`,
    inputLabel: `Input ${id}`,
    contentHash: `hash-${id}`,
    extractionJobId: "job-1",
    processedAt: "2026-09-17T00:00:00.000Z",
    processingDurationSeconds: 1,
    status: extractedData ? "success" : "failed",
    extractedData,
    errorMessage: null,
    usageMetrics: null,
    createdAt: "2026-09-17T00:00:00.000Z",
  };
}

describe("filterUtils", () => {
  const successfulResults = [
    result("1", {
      company: "OpenAI",
      skills: ["typescript", "react"],
      remote: true,
      items: [
        { category: "platform", price: 10 },
        { category: "ai", price: 20 },
      ],
    }),
    result("2", {
      company: "Acme",
      skills: ["typescript"],
      remote: false,
      items: [{ category: "platform", price: 15 }],
    }),
    result("3", {
      company: "OpenAI",
      skills: ["python"],
      remote: true,
      details: { level: "senior", department: "research" },
    }),
  ];

  it("computes facets for scalars, primitive arrays, object arrays, and flat objects", () => {
    const facets = computeFacets(successfulResults);
    const byKey = new Map(facets.map((facet) => [facet.key, facet]));

    expect(byKey.get("company")).toMatchObject({
      key: "company",
      totalResults: 3,
      values: [
        { value: "OpenAI", count: 2 },
        { value: "Acme", count: 1 },
      ],
    });
    expect(byKey.get("skills")).toMatchObject({
      key: "skills",
      totalResults: 3,
      values: [
        { value: "typescript", count: 2 },
        { value: "react", count: 1 },
        { value: "python", count: 1 },
      ],
    });
    expect(byKey.get("items.category")).toMatchObject({
      key: "items.category",
      totalResults: 2,
      values: [
        { value: "platform", count: 2 },
        { value: "ai", count: 1 },
      ],
    });
    expect(byKey.get("details.level")).toMatchObject({
      key: "details.level",
      totalResults: 1,
      values: [{ value: "senior", count: 1 }],
    });
  });

  it("matches OR values within a facet and AND conditions across facets", () => {
    const filters: FilterState = {
      company: ["OpenAI", "Acme"],
      "items.category": ["ai"],
    };

    expect(matchesFilters(successfulResults[0], filters)).toBe(true);
    expect(matchesFilters(successfulResults[1], filters)).toBe(false);
    expect(matchesFilters(successfulResults[2], filters)).toBe(false);
  });

  it("matches primitive array and flat-object sub-field filters", () => {
    expect(matchesFilters(successfulResults[0], { skills: ["react"] })).toBe(true);
    expect(matchesFilters(successfulResults[1], { skills: ["react"] })).toBe(false);
    expect(matchesFilters(successfulResults[2], { "details.department": ["research"] })).toBe(true);
  });

  it("excludes results without extracted data when filters are active", () => {
    expect(matchesFilters(result("failed", null), { company: ["OpenAI"] })).toBe(false);
  });
});
