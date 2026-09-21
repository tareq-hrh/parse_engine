"use client";

import { Download, Loader2, SlidersHorizontal, X } from "lucide-react";

import { Button } from "@/components/shadcn_ui/button";
import { TabsContent } from "@/components/shadcn_ui/tabs";
import type { ExtractionResult } from "@/components/features/extraction-jobs/types";
import { ExtractionResultCard } from "@/components/features/extraction-jobs/results/ExtractionResultCard";
import type { FilterState } from "@/components/features/extraction-jobs/filters/filterUtils";

import { ResultPaginationControls } from "./ResultPaginationControls";

function truncateValue(str: string, max = 70): string {
  return str.length > max ? `${str.slice(0, max)}\u2026` : str;
}

export function SuccessfulResultsTab({
  resultsLoading,
  resultsError,
  successfulResults,
  failedResults,
  filteredSuccessfulResults,
  paginatedSuccessfulResults,
  activeFilters,
  activeFilterCount,
  selectedJobIsRunning,
  hasAnyResults,
  resultDeleteDisabled,
  page,
  pageSize,
  onRetryResults,
  onClearAll,
  onToggleValue,
  onOpenFilterSheet,
  onDownloadJSON,
  onPageChange,
  onDeleteResult,
}: {
  resultsLoading: boolean;
  resultsError: boolean;
  successfulResults: ExtractionResult[];
  failedResults: ExtractionResult[];
  filteredSuccessfulResults: ExtractionResult[];
  paginatedSuccessfulResults: ExtractionResult[];
  activeFilters: FilterState;
  activeFilterCount: number;
  selectedJobIsRunning: boolean;
  hasAnyResults: boolean;
  resultDeleteDisabled: boolean;
  page: number;
  pageSize: number;
  onRetryResults: () => void;
  onClearAll: () => void;
  onToggleValue: (key: string, value: string) => void;
  onOpenFilterSheet: () => void;
  onDownloadJSON: () => void;
  onPageChange: (page: number) => void;
  onDeleteResult: (resultId: string) => Promise<boolean>;
}) {
  return (
    <TabsContent value="results" className="mt-3">
      {resultsLoading ? (
        <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground font-mono">
          <Loader2 className="size-3.5 animate-spin" />
          Loading results...
        </div>
      ) : resultsError ? (
        <div className="space-y-2 py-3 font-mono text-xs text-muted-foreground">
          <p>Failed to load results.</p>
          <button
            type="button"
            onClick={onRetryResults}
            className="text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      ) : successfulResults.length === 0 ? (
        selectedJobIsRunning ? (
          <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground font-mono">
            <Loader2 className="size-3.5 animate-spin" />
            {hasAnyResults ? "Waiting for a successful result..." : "Waiting for the first result..."}
          </div>
        ) : failedResults.length > 0 ? (
          <p className="text-xs text-muted-foreground font-mono">
            No successful results yet. Check the Failed tab.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground font-mono">No results yet.</p>
        )
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
              {activeFilterCount > 0 && (
                <>
                  <span>
                    {filteredSuccessfulResults.length} of {successfulResults.length} match
                  </span>
                  <span className="text-muted-foreground/40">&middot;</span>
                  <button
                    onClick={onClearAll}
                    className="text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                  >
                    Clear filters
                  </button>
                </>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-1.5">
              <Button
                size="sm"
                variant="outline"
                onClick={onOpenFilterSheet}
                className="font-mono text-xs gap-1.5 rounded-sm cursor-pointer h-7 px-2"
              >
                <SlidersHorizontal className="size-3" />
                Filter
                {activeFilterCount > 0 && (
                  <span className="ml-0.5 bg-blue-500 text-white font-mono text-[10px] rounded-full size-4 flex items-center justify-center shrink-0">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onDownloadJSON}
                className="font-mono text-xs gap-1.5 rounded-sm cursor-pointer h-7 px-2"
              >
                <Download className="w-3 h-3" />
                Export JSON
              </Button>
            </div>
          </div>

          {activeFilterCount > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {Object.entries(activeFilters).flatMap(([key, values]) =>
                values.map((value) => (
                  <span
                    key={`${key}:${value}`}
                    className="inline-flex items-center gap-1 bg-blue-500/10 border border-blue-500/20 rounded-sm px-1.5 py-0.5 font-mono text-[10px] max-w-full"
                  >
                    <span className="uppercase text-muted-foreground shrink-0">
                      {key.replace(/_/g, " ")}:
                    </span>
                    <span className="text-blue-400 truncate" title={value}>
                      {truncateValue(value)}
                    </span>
                    <button
                      onClick={() => onToggleValue(key, value)}
                      className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0 leading-none"
                    >
                      <X className="size-3.5" />
                    </button>
                  </span>
                )),
              )}
            </div>
          )}

          {filteredSuccessfulResults.length === 0 ? (
            <p className="text-xs text-muted-foreground font-mono">
              No results match the current filters.
            </p>
          ) : (
            <div className="space-y-3">
              <div className="space-y-4">
                {paginatedSuccessfulResults.map((result) => (
                  <ExtractionResultCard
                    key={result.id}
                    result={result}
                    deleteDisabled={resultDeleteDisabled}
                    onDeleteResult={onDeleteResult}
                  />
                ))}
              </div>
              <ResultPaginationControls
                page={page}
                totalItems={filteredSuccessfulResults.length}
                pageSize={pageSize}
                itemLabel="result"
                onPageChange={onPageChange}
              />
            </div>
          )}
        </>
      )}
    </TabsContent>
  );
}
