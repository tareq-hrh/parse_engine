import { describe, expect, it } from "vitest";
import { sanitizeExtractedData } from "@/lib/sanitizeExtractedData";

describe("sanitizeExtractedData", () => {
  it("trims strings and removes blank top-level values", () => {
    expect(
      sanitizeExtractedData({
        name: "  Acme Inc  ",
        empty: "   ",
        missing: null,
        count: 0,
        active: false,
      }),
    ).toEqual({
      name: "Acme Inc",
      count: 0,
      active: false,
    });
  });

  it("cleans primitive arrays and drops arrays that become empty", () => {
    expect(
      sanitizeExtractedData({
        tags: [" alpha ", "", null, undefined, "beta", 3, false, { ignored: true }],
        blanks: ["", null, undefined],
      }),
    ).toEqual({
      tags: ["alpha", "beta", 3, false],
    });
  });

  it("cleans arrays of flat objects and removes empty rows", () => {
    expect(
      sanitizeExtractedData({
        lineItems: [
          {
            name: "  Widget ",
            quantity: 0,
            taxable: false,
            notes: " ",
            tags: [" hardware ", "", true, null],
            nested: { ignored: true },
          },
          {
            name: "",
            notes: null,
          },
          null,
        ],
      }),
    ).toEqual({
      lineItems: [
        {
          name: "Widget",
          quantity: 0,
          taxable: false,
          tags: ["hardware", true],
        },
      ],
    });
  });

  it("returns an empty object for unexpected top-level shapes", () => {
    expect(sanitizeExtractedData(["not", "an", "object"] as unknown as Record<string, unknown>)).toEqual({});
    expect(sanitizeExtractedData(null as unknown as Record<string, unknown>)).toEqual({});
  });
});
