"use client";

import { useId, useState } from "react";
import { ChevronDown, Gauge } from "lucide-react";
import type { UsageMetrics } from "./types";
import { formatTokenCount, formatUsageDuration } from "./usageMetricsUtils";

export function UsageMetricsDisclosure({ metrics }: { metrics: UsageMetrics | null }) {
  const [open, setOpen] = useState(false);
  const metricsId = useId();

  if (!metrics) return null;

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={metricsId}
        className="inline-flex items-center gap-1 font-mono text-[10px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-sm"
      >
        <Gauge className="size-3" />
        Metrics
        <ChevronDown
          className={`size-3 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          id={metricsId}
          className="grid gap-2 rounded-sm border border-border bg-muted/20 p-2 font-mono text-[10px] text-muted-foreground sm:grid-cols-2 xl:grid-cols-4"
        >
          <MetricItem label="Total" value={formatUsageDuration(metrics.totalDuration)} />
          <MetricItem label="Load" value={formatUsageDuration(metrics.loadDuration)} />
          <MetricItem
            label="Prompt"
            value={`${formatTokenCount(metrics.promptEvalCount)} / ${formatUsageDuration(
              metrics.promptEvalDuration,
            )}`}
          />
          <MetricItem
            label="Output"
            value={`${formatTokenCount(metrics.evalCount)} / ${formatUsageDuration(
              metrics.evalDuration,
            )}`}
          />
        </div>
      )}
    </div>
  );
}

function MetricItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="uppercase tracking-wider text-muted-foreground/60">{label}</div>
      <div className="truncate text-foreground" title={value}>
        {value}
      </div>
    </div>
  );
}
