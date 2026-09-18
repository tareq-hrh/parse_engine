import { describe, expect, it } from "vitest";
import {
  formatTokenCount,
  formatUsageDuration,
} from "@/components/extraction-job/usageMetricsUtils";

describe("usageMetricsUtils", () => {
  it("formats Ollama nanosecond durations for display", () => {
    expect(formatUsageDuration(0)).toBe("0ms");
    expect(formatUsageDuration(500_000)).toBe("0.50ms");
    expect(formatUsageDuration(250_000_000)).toBe("250ms");
    expect(formatUsageDuration(2_500_000_000)).toBe("2.50s");
    expect(formatUsageDuration(75_000_000_000)).toBe("1m 15s");
  });

  it("formats token counts compactly", () => {
    expect(formatTokenCount(0)).toBe("0 tok");
    expect(formatTokenCount(1200)).toBe("1,200 tok");
    expect(formatTokenCount(-1)).toBe("0 tok");
  });
});
