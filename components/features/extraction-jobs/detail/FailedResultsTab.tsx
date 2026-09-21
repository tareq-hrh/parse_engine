"use client";

import { Loader2, RotateCcw } from "lucide-react";

import { Button } from "@/components/shadcn_ui/button";
import { TabsContent } from "@/components/shadcn_ui/tabs";
import type { ExtractionResult } from "@/components/features/extraction-jobs/types";
import { FailedResultCard } from "@/components/features/extraction-jobs/results/FailedResultCard";

import { ResultPaginationControls } from "./ResultPaginationControls";

export function FailedResultsTab({
  failedResults,
  paginatedFailedResults,
  retryFailedLoading,
  actionLoading,
  stopping,
  hasAnyRunningJob,
  anotherJobIsRunning,
  resultDeleteDisabled,
  page,
  pageSize,
  onRetryFailed,
  onPageChange,
  onDeleteResult,
}: {
  failedResults: ExtractionResult[];
  paginatedFailedResults: ExtractionResult[];
  retryFailedLoading: boolean;
  actionLoading: boolean;
  stopping: boolean;
  hasAnyRunningJob: boolean;
  anotherJobIsRunning: boolean;
  resultDeleteDisabled: boolean;
  page: number;
  pageSize: number;
  onRetryFailed: () => void;
  onPageChange: (page: number) => void;
  onDeleteResult: (resultId: string) => Promise<boolean>;
}) {
  return (
    <TabsContent value="failed" className="mt-3">
      <div className="mb-3 flex items-start justify-between gap-3 rounded-sm border border-red-500/20 bg-red-500/5 p-3">
        <div className="space-y-1">
          <p className="font-mono text-xs text-foreground">Failed inputs are preserved.</p>
          <p className="text-xs text-muted-foreground font-mono">
            They are skipped by Start until you clear failed results. Successful results stay
            untouched.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={onRetryFailed}
            disabled={retryFailedLoading || actionLoading || stopping || hasAnyRunningJob}
            className="rounded-sm font-mono text-xs gap-1.5 shrink-0 border-red-500/30 text-red-400 hover:text-red-300"
          >
            {retryFailedLoading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RotateCcw className="size-3.5" />
            )}
            {retryFailedLoading ? "Clearing..." : "Clear failed for retry"}
          </Button>
          {anotherJobIsRunning && (
            <span className="font-mono text-[10px] text-muted-foreground">
              Another job is running
            </span>
          )}
        </div>
      </div>
      <div className="space-y-3">
        <div className="space-y-4">
          {paginatedFailedResults.map((result) => (
            <FailedResultCard
              key={result.id}
              result={result}
              deleteDisabled={resultDeleteDisabled}
              onDeleteResult={onDeleteResult}
            />
          ))}
        </div>
        <ResultPaginationControls
          page={page}
          totalItems={failedResults.length}
          pageSize={pageSize}
          itemLabel="failed result"
          onPageChange={onPageChange}
        />
      </div>
    </TabsContent>
  );
}
