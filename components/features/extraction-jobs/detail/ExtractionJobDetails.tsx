"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, FileText, XCircle } from "lucide-react";

import { ScrollArea } from "@/components/shadcn_ui/scroll-area";
import { Separator } from "@/components/shadcn_ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/shadcn_ui/tabs";
import type { ExtractionJob, ExtractionResult } from "@/components/features/extraction-jobs/types";
import { getJobStatus } from "@/components/features/extraction-jobs/utils";
import { FilterSheet } from "@/components/features/extraction-jobs/filters/FilterSheet";
import {
  computeFacets,
  matchesFilters,
  type FilterState,
} from "@/components/features/extraction-jobs/filters/filterUtils";

import { ExtractionJobHeader } from "./ExtractionJobHeader";
import { ExtractionJobProgress } from "./ExtractionJobProgress";
import { FailedResultsTab } from "./FailedResultsTab";
import { InstructionTab } from "./InstructionTab";
import { SuccessfulResultsTab } from "./SuccessfulResultsTab";
import { RESULT_PAGE_SIZE, getPageSlice, getTotalPages } from "./resultPagination";

export function ExtractionJobDetails({
  job,
  successfulResults,
  failedResults,
  resultsLoading,
  resultsError,
  onRetryResults,
  runningJobId,
  actionLoading,
  onStart,
  onStop,
  stopping,
  retryFailedLoading,
  onRetryFailed,
  deleteLoading,
  onDeleteJob,
  onDeleteResult,
  titleUpdateLoading,
  onUpdateTitle,
}: {
  job: ExtractionJob;
  successfulResults: ExtractionResult[];
  failedResults: ExtractionResult[];
  resultsLoading: boolean;
  resultsError: boolean;
  onRetryResults: () => void;
  runningJobId: string | null;
  actionLoading: boolean;
  onStart: () => void;
  onStop: () => void;
  stopping: boolean;
  retryFailedLoading: boolean;
  onRetryFailed: () => void;
  deleteLoading: boolean;
  onDeleteJob: () => Promise<boolean>;
  onDeleteResult: (resultId: string) => Promise<boolean>;
  titleUpdateLoading: boolean;
  onUpdateTitle: (title: string) => Promise<boolean>;
}) {
  const [activeFilters, setActiveFilters] = useState<FilterState>({});
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [resultPages, setResultPages] = useState({
    jobId: job.id,
    successful: 1,
    failed: 1,
  });

  const selectedJobIsRunning = runningJobId ? runningJobId === job.id : job.isRunning;
  const anotherJobIsRunning = runningJobId !== null && runningJobId !== job.id;
  const hasAnyRunningJob = selectedJobIsRunning || anotherJobIsRunning;
  const status = getJobStatus({ ...job, isRunning: selectedJobIsRunning });
  const deleteDisabled =
    deleteLoading || actionLoading || retryFailedLoading || stopping || hasAnyRunningJob;
  const resultDeleteDisabled =
    actionLoading || retryFailedLoading || deleteLoading || stopping || hasAnyRunningJob;

  const facets = useMemo(() => computeFacets(successfulResults), [successfulResults]);

  const activeFilterCount = Object.values(activeFilters).filter((value) => value.length > 0).length;
  const hasAnyResults = successfulResults.length + failedResults.length > 0;

  const filteredSuccessfulResults = useMemo(() => {
    if (activeFilterCount === 0) return successfulResults;
    return successfulResults.filter((result) => matchesFilters(result, activeFilters));
  }, [activeFilterCount, activeFilters, successfulResults]);

  const successfulResultsTotalPages = getTotalPages(
    filteredSuccessfulResults.length,
    RESULT_PAGE_SIZE,
  );
  const failedResultsTotalPages = getTotalPages(failedResults.length, RESULT_PAGE_SIZE);
  const currentResultPages =
    resultPages.jobId === job.id
      ? resultPages
      : {
          jobId: job.id,
          successful: 1,
          failed: 1,
        };
  const successfulResultsPage = Math.min(
    currentResultPages.successful,
    successfulResultsTotalPages,
  );
  const failedResultsPage = Math.min(currentResultPages.failed, failedResultsTotalPages);

  const paginatedSuccessfulResults = useMemo(
    () => getPageSlice(filteredSuccessfulResults, successfulResultsPage, RESULT_PAGE_SIZE),
    [filteredSuccessfulResults, successfulResultsPage],
  );
  const paginatedFailedResults = useMemo(
    () => getPageSlice(failedResults, failedResultsPage, RESULT_PAGE_SIZE),
    [failedResults, failedResultsPage],
  );

  function setSuccessfulResultsPage(page: number) {
    setResultPages((current) => ({
      jobId: job.id,
      successful: page,
      failed: current.jobId === job.id ? current.failed : 1,
    }));
  }

  function setFailedResultsPage(page: number) {
    setResultPages((current) => ({
      jobId: job.id,
      successful: current.jobId === job.id ? current.successful : 1,
      failed: page,
    }));
  }

  function handleToggleValue(key: string, value: string) {
    setSuccessfulResultsPage(1);
    setActiveFilters((previousFilters) => {
      const currentValues = previousFilters[key] ?? [];
      const nextValues = currentValues.includes(value)
        ? currentValues.filter((currentValue) => currentValue !== value)
        : [...currentValues, value];

      return { ...previousFilters, [key]: nextValues };
    });
  }

  function handleClearAll() {
    setSuccessfulResultsPage(1);
    setActiveFilters({});
  }

  function handleDownloadJSON() {
    const rows = successfulResults.map((result) => ({
      inputLabel: result.inputLabel,
      processedAt: result.processedAt,
      processingDurationSeconds: result.processingDurationSeconds,
      data: result.extractedData,
    }));
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${job.title}-results.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <ScrollArea className="flex-1">
      <div className="px-3 py-5 space-y-5">
        <ExtractionJobHeader
          job={job}
          status={status}
          selectedJobIsRunning={selectedJobIsRunning}
          anotherJobIsRunning={anotherJobIsRunning}
          hasAnyRunningJob={hasAnyRunningJob}
          actionLoading={actionLoading}
          retryFailedLoading={retryFailedLoading}
          stopping={stopping}
          deleteLoading={deleteLoading}
          deleteDisabled={deleteDisabled}
          titleUpdateLoading={titleUpdateLoading}
          onStart={onStart}
          onStop={onStop}
          onDeleteJob={onDeleteJob}
          onUpdateTitle={onUpdateTitle}
        />

        <Separator />

        <ExtractionJobProgress job={job} status={status} />

        <Separator />

        <Tabs defaultValue="results">
          <TabsList className="w-full">
            <TabsTrigger value="results" className="flex-1 font-mono text-xs gap-1.5">
              <CheckCircle2 className="size-3.5 text-emerald-400" />
              Results (
              {activeFilterCount > 0
                ? `${filteredSuccessfulResults.length}/${successfulResults.length}`
                : successfulResults.length}
              )
            </TabsTrigger>
            {failedResults.length > 0 && (
              <TabsTrigger value="failed" className="flex-1 font-mono text-xs gap-1.5">
                <XCircle className="size-3.5 text-red-400" />
                Failed ({failedResults.length})
              </TabsTrigger>
            )}
            <TabsTrigger value="instruction" className="flex-1 font-mono text-xs gap-1.5">
              <FileText className="size-3.5 text-muted-foreground" />
              Instruction
            </TabsTrigger>
          </TabsList>

          <SuccessfulResultsTab
            resultsLoading={resultsLoading}
            resultsError={resultsError}
            successfulResults={successfulResults}
            failedResults={failedResults}
            filteredSuccessfulResults={filteredSuccessfulResults}
            paginatedSuccessfulResults={paginatedSuccessfulResults}
            activeFilters={activeFilters}
            activeFilterCount={activeFilterCount}
            selectedJobIsRunning={selectedJobIsRunning}
            hasAnyResults={hasAnyResults}
            resultDeleteDisabled={resultDeleteDisabled}
            page={successfulResultsPage}
            pageSize={RESULT_PAGE_SIZE}
            onRetryResults={onRetryResults}
            onClearAll={handleClearAll}
            onToggleValue={handleToggleValue}
            onOpenFilterSheet={() => setFilterSheetOpen(true)}
            onDownloadJSON={handleDownloadJSON}
            onPageChange={setSuccessfulResultsPage}
            onDeleteResult={onDeleteResult}
          />

          {failedResults.length > 0 && (
            <FailedResultsTab
              failedResults={failedResults}
              paginatedFailedResults={paginatedFailedResults}
              retryFailedLoading={retryFailedLoading}
              actionLoading={actionLoading}
              stopping={stopping}
              hasAnyRunningJob={hasAnyRunningJob}
              anotherJobIsRunning={anotherJobIsRunning}
              resultDeleteDisabled={resultDeleteDisabled}
              page={failedResultsPage}
              pageSize={RESULT_PAGE_SIZE}
              onRetryFailed={onRetryFailed}
              onPageChange={setFailedResultsPage}
              onDeleteResult={onDeleteResult}
            />
          )}

          <InstructionTab instruction={job.instruction} />
        </Tabs>
      </div>

      <FilterSheet
        open={filterSheetOpen}
        onOpenChange={setFilterSheetOpen}
        facets={facets}
        activeFilters={activeFilters}
        onToggleValue={handleToggleValue}
        onClearAll={handleClearAll}
      />
    </ScrollArea>
  );
}
