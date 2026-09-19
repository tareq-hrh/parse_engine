"use client";

import { useState } from "react";
import { XCircle, Clock, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/shadcn_ui/scroll-area";
import {
  fetchDatasetInputContent,
  getDatasetInputContentErrorMessage,
} from "@/lib/datasetInputContentClient";
import { ExtractionResult } from "./types";
import { formatTime } from "./utils";
import { UsageMetricsDisclosure } from "./UsageMetricsDisclosure";

export function FailedResultCard({ result }: { result: ExtractionResult }) {
  const [expanded, setExpanded] = useState(false);
  const [contentExpanded, setContentExpanded] = useState(false);
  const [content, setContent] = useState<string | null>(null);
  const [contentError, setContentError] = useState<string | null>(null);
  const [contentLoading, setContentLoading] = useState(false);
  const errorId = `failed-result-error-${result.id}`;
  const contentId = `failed-result-content-${result.id}`;

  async function handleContentToggle() {
    if (contentExpanded) {
      setContentExpanded(false);
      return;
    }

    if (content === null) {
      setContentLoading(true);
      setContentError(null);
      try {
        setContent(await fetchDatasetInputContent(result.datasetInputId));
      } catch (error) {
        setContentError(getDatasetInputContentErrorMessage(error));
      } finally {
        setContentLoading(false);
      }
    }

    setContentExpanded(true);
  }

  return (
    <div className="border border-red-500/20 bg-red-500/5 rounded-lg p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <XCircle className="size-3.5 text-red-400 shrink-0" />
          <span className="font-mono text-sm text-foreground truncate">{result.inputLabel}</span>
        </div>
        <p className="font-mono text-[11px] text-muted-foreground/80 shrink-0">
          {new Date(result.createdAt).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>

      <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
        <div className="flex items-center gap-3">
          {result.errorMessage && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              aria-controls={errorId}
              className="text-red-400 hover:text-red-400 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-sm"
            >
              {expanded ? "Hide error" : "Show error"}
            </button>
          )}
          <button
            type="button"
            onClick={handleContentToggle}
            aria-expanded={contentExpanded}
            aria-controls={contentId}
            className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-sm"
          >
            {contentLoading ? (
              <span className="flex items-center gap-1">
                <Loader2 className="size-3 animate-spin" />
                Loading...
              </span>
            ) : contentExpanded ? (
              "Hide input content"
            ) : (
              "Show input content"
            )}
          </button>
        </div>
        <span className="flex items-center gap-0.5">
          <Clock className="size-3" />
          {formatTime(result.processingDurationSeconds)}
        </span>
      </div>

      <UsageMetricsDisclosure metrics={result.usageMetrics} />

      {expanded && result.errorMessage && (
        <ScrollArea id={errorId} className="h-48 rounded border border-red-500/30 bg-red-500/20">
          <pre className="font-mono text-[10px] text-red-700 p-2 whitespace-pre-wrap break-all">
            {(() => {
              try {
                return JSON.stringify(JSON.parse(result.errorMessage), null, 2);
              } catch {
                return result.errorMessage;
              }
            })()}
          </pre>
        </ScrollArea>
      )}

      {contentExpanded && content !== null && (
        <ScrollArea id={contentId} className="h-48 rounded-sm border border-border bg-muted/30">
          <pre className="font-mono text-[10px] text-foreground p-2 whitespace-pre-wrap break-all">
            {content}
          </pre>
        </ScrollArea>
      )}

      {contentExpanded && contentError && (
        <div className="rounded-sm border border-destructive/30 bg-destructive/10 p-2 font-mono text-[10px] text-destructive">
          {contentError}
        </div>
      )}
    </div>
  );
}
