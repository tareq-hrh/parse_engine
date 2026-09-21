"use client";

import { type KeyboardEvent, useMemo, useState } from "react";
import { ScrollArea } from "@/components/shadcn_ui/scroll-area";
import { Separator } from "@/components/shadcn_ui/separator";
import { Button } from "@/components/shadcn_ui/button";
import { Input } from "@/components/shadcn_ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/shadcn_ui/tabs";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/shadcn_ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/shadcn_ui/dropdown-menu";
import {
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Play,
  Loader2,
  Square,
  Cpu,
  SlidersHorizontal,
  X,
  Download,
  RotateCcw,
  Trash2,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Check,
} from "lucide-react";
import { schemaToSimplePreview } from "@/components/features/instructions/schema-builder/SchemaBuilder";
import { ExtractionJob, ExtractionResult } from "@/components/features/extraction-jobs/types";
import { getJobStatus, formatTime } from "@/components/features/extraction-jobs/utils";
import { StatusBadge } from "./StatusBadge";
import { ModelOptionsDisplay } from "./ModelOptionsDisplay";
import { ExtractionResultCard } from "@/components/features/extraction-jobs/results/ExtractionResultCard";
import { FailedResultCard } from "@/components/features/extraction-jobs/results/FailedResultCard";
import { FilterSheet } from "@/components/features/extraction-jobs/filters/FilterSheet";
import { computeFacets, matchesFilters, FilterState } from "@/components/features/extraction-jobs/filters/filterUtils";

function truncateValue(str: string, max = 70): string {
  return str.length > max ? str.slice(0, max) + "…" : str;
}

const RESULT_PAGE_SIZE = 10;

function getTotalPages(totalItems: number, pageSize: number): number {
  return Math.max(1, Math.ceil(totalItems / pageSize));
}

function getPageSlice<T>(items: T[], page: number, pageSize: number): T[] {
  const totalPages = getTotalPages(items.length, pageSize);
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const startIndex = (safePage - 1) * pageSize;
  return items.slice(startIndex, startIndex + pageSize);
}

function ResultPaginationControls({
  page,
  totalItems,
  pageSize,
  itemLabel,
  onPageChange,
}: {
  page: number;
  totalItems: number;
  pageSize: number;
  itemLabel: string;
  onPageChange: (page: number) => void;
}) {
  const totalPages = getTotalPages(totalItems, pageSize);
  if (totalItems <= pageSize) return null;

  const safePage = Math.min(Math.max(page, 1), totalPages);
  const pluralLabel = totalItems === 1 ? itemLabel : `${itemLabel}s`;

  return (
    <div className="flex items-center gap-2 pt-2">
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          className="size-9 p-0"
          aria-label={`Go to previous ${itemLabel} page`}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
          className="size-9 p-0"
          aria-label={`Go to next ${itemLabel} page`}
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
      </div>
      <span className="font-mono text-[11px] text-muted-foreground">
        {totalItems} {pluralLabel} · page {safePage} of {totalPages}
      </span>
    </div>
  );
}

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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [titleEditing, setTitleEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState(job.title);
  const [resultPages, setResultPages] = useState({
    jobId: job.id,
    successful: 1,
    failed: 1,
  });

  const instructionTitle = job.instruction.title;
  const datasetName = job.dataset.name;
  const trimmedTitleDraft = titleDraft.trim();
  const titleSaveDisabled =
    titleUpdateLoading || trimmedTitleDraft.length === 0 || trimmedTitleDraft === job.title;
  const selectedJobIsRunning = runningJobId ? runningJobId === job.id : job.isRunning;
  const anotherJobIsRunning = runningJobId !== null && runningJobId !== job.id;
  const hasAnyRunningJob = selectedJobIsRunning || anotherJobIsRunning;
  const status = getJobStatus({ ...job, isRunning: selectedJobIsRunning });
  const total = job.totalInputCount;
  const deleteDisabled =
    deleteLoading || actionLoading || retryFailedLoading || stopping || hasAnyRunningJob;
  const resultDeleteDisabled =
    actionLoading || retryFailedLoading || deleteLoading || stopping || hasAnyRunningJob;

  const successPercent =
    total > 0 ? Math.min(100, Math.round((job.successfulResultCount / total) * 100)) : 0;
  const failurePercent =
    total > 0 ? Math.min(100, Math.round((job.failedResultCount / total) * 100)) : 0;

  // ── Facets — recomputed each time successfulResults updates (each poll) ─────────
  const facets = useMemo(() => computeFacets(successfulResults), [successfulResults]);

  const activeFilterCount = Object.values(activeFilters).filter((v) => v.length > 0).length;
  const hasAnyResults = successfulResults.length + failedResults.length > 0;

  // ── Filtered list — new arrivals automatically pass through the same logic ─
  const filteredSuccessfulResults = useMemo(() => {
    if (activeFilterCount === 0) return successfulResults;
    return successfulResults.filter((result) => matchesFilters(result, activeFilters));
  }, [successfulResults, activeFilters, activeFilterCount]);

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
    setActiveFilters((prev) => {
      const current = prev[key] ?? [];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [key]: next };
    });
  }

  function handleClearAll() {
    setSuccessfulResultsPage(1);
    setActiveFilters({});
  }

  function handleStartTitleEdit() {
    setTitleDraft(job.title);
    setTitleEditing(true);
  }

  function handleCancelTitleEdit() {
    if (titleUpdateLoading) return;
    setTitleDraft(job.title);
    setTitleEditing(false);
  }

  async function handleSaveTitle() {
    if (titleSaveDisabled) {
      if (trimmedTitleDraft === job.title) {
        setTitleEditing(false);
      }
      return;
    }

    const updated = await onUpdateTitle(trimmedTitleDraft);
    if (updated) {
      setTitleDraft(trimmedTitleDraft);
      setTitleEditing(false);
    }
  }

  function handleTitleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      void handleSaveTitle();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      handleCancelTitleEdit();
    }
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

  async function handleConfirmDelete() {
    const deleted = await onDeleteJob();
    if (deleted) {
      setDeleteDialogOpen(false);
    }
  }

  return (
    <ScrollArea className="flex-1">
      <div className="px-3 py-5 space-y-5">
        {/* ── Header row ──────────────────────────────────────────────── */}
        <div >
          <div className="flex flex-wrap items-center gap-2 justify-between mb-2">
            {(selectedJobIsRunning || status === "pending" || anotherJobIsRunning) && (
              <div className="flex flex-col items-start gap-1">
                {selectedJobIsRunning ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onStop}
                    disabled={stopping}
                    className="cursor-pointer group uppercase rounded-sm font-mono text-xs gap-1.5 border-red-400 text-red-400 bg-transparent hover:bg-red-400/10 hover:text-red-700 hover:border-red-700 disabled:opacity-40 shrink-0"
                  >
                    {stopping ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Square className="size-4 fill-red-400 group-hover:fill-red-700" />
                    )}
                    {stopping ? "Stopping..." : "Stop"}
                  </Button>
                ) : status === "pending" ? (
                  <Button
                    size="sm"
                    onClick={onStart}
                    disabled={actionLoading || retryFailedLoading || stopping || hasAnyRunningJob}
                    className="cursor-pointer rounded-sm uppercase font-mono text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 shrink-0"
                  >
                    {actionLoading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Play className="size-4 fill-white" />
                    )}
                    {actionLoading ? "Starting..." : "Start"}
                  </Button>
                ) : null}
                {anotherJobIsRunning && (
                  <span className="font-mono py-1.5 text-[10px] text-muted-foreground">
                    Another job is running
                  </span>
                )}
              </div>
            )}
            <StatusBadge status={status} />
          </div>

          <div className="flex gap-2 items-start justify-between">
            {/* ── Left: extraction job info ─────────────────────────────────────────── */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                {titleEditing ? (
                  <div className="flex min-w-0 flex-1 items-center gap-1.5">
                    <Input
                      value={titleDraft}
                      onChange={(event) => setTitleDraft(event.target.value)}
                      onKeyDown={handleTitleKeyDown}
                      disabled={titleUpdateLoading}
                      autoFocus
                      aria-label="Extraction job title"
                      aria-invalid={trimmedTitleDraft.length === 0}
                      className="h-8 min-w-48 max-w-lg rounded-sm font-mono text-base font-semibold"
                    />
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="outline"
                      onClick={() => {
                        void handleSaveTitle();
                      }}
                      disabled={titleSaveDisabled}
                      className="rounded-sm"
                      aria-label="Save extraction job title"
                    >
                      {titleUpdateLoading ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Check className="size-3.5" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      onClick={handleCancelTitleEdit}
                      disabled={titleUpdateLoading}
                      className="rounded-sm text-muted-foreground hover:text-foreground"
                      aria-label="Cancel title edit"
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex min-w-0 items-center gap-1.5">
                    <h2 className="font-mono text-base font-semibold text-foreground">
                      {job.title}
                    </h2>
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="ghost"
                      onClick={handleStartTitleEdit}
                      disabled={titleUpdateLoading}
                      className="rounded-sm text-muted-foreground hover:text-foreground"
                      aria-label="Edit extraction job title"
                    >
                      <Pencil className="size-3" />
                    </Button>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground font-mono mb-1">
                <span>
                  Model: <span className="text-foreground">{job.modelName}</span>
                </span>
                <span>
                  Instruction: <span className="text-foreground">{instructionTitle}</span>
                </span>
                <span>
                  Dataset: <span className="text-foreground">{datasetName}</span>
                </span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground font-mono">
                <ModelOptionsDisplay options={job.modelOptions} />
              </div>
            </div>

            {/* ── Right: Stats + Start button ───────────────────────────── */}
            <div className="flex items-center gap-6 pr-3 shrink-0">
              {/* Stats */}
              <div className="flex gap-8">
                <div className="space-y-0.5">
                  <p className="font-mono text-sm text-muted-foreground uppercase tracking-wider">
                    Started
                  </p>
                  <p className="font-mono text-sm text-foreground">
                    {job.startedAt
                      ? new Date(job.startedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })
                      : "—"}
                  </p>
                </div>
                <div className="space-y-0.5">
                  <p className="font-mono text-sm text-muted-foreground uppercase tracking-wider">
                    Total Time
                  </p>
                  <p className="font-mono text-sm text-foreground flex items-center gap-1">
                    <Clock className="size-4 text-blue-400" />
                    {formatTime(job.totalProcessingTimeSeconds)}
                  </p>
                </div>
              </div>
              <Dialog
                open={deleteDialogOpen}
                onOpenChange={(open) => {
                  if (!deleteLoading) setDeleteDialogOpen(open);
                }}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="icon-sm"
                      variant="outline"
                      disabled={deleteLoading}
                      className="rounded-sm text-muted-foreground hover:text-foreground"
                      aria-label="Open job actions"
                    >
                      {deleteLoading ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <MoreHorizontal className="size-3.5" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem
                      variant="destructive"
                      disabled={deleteDisabled}
                      onSelect={(event) => {
                        event.preventDefault();
                        setDeleteDialogOpen(true);
                      }}
                      className="font-mono text-xs"
                    >
                      <Trash2 className="size-3.5" />
                      Delete job
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <DialogContent className="font-mono">
                  <DialogHeader>
                    <DialogTitle>Delete extraction job?</DialogTitle>
                    <DialogDescription>
                      This deletes the job and all of its extraction results. The dataset inputs and
                      instruction stay untouched.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="rounded-sm border border-border bg-muted/30 p-3 text-xs">
                    <div className="text-muted-foreground uppercase tracking-wider">Job</div>
                    <div className="mt-1 text-foreground wrap-break-word">{job.title}</div>
                    <div className="mt-3 text-muted-foreground">
                      Results to remove: {job.successfulResultCount + job.failedResultCount}
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button
                        variant="outline"
                        disabled={deleteLoading}
                        className="font-mono text-xs"
                      >
                        Cancel
                      </Button>
                    </DialogClose>
                    <Button
                      variant="destructive"
                      disabled={deleteLoading}
                      onClick={handleConfirmDelete}
                      className="font-mono text-xs gap-1.5"
                    >
                      {deleteLoading && <Loader2 className="size-3.5 animate-spin" />}
                      Delete job
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        <Separator />

        {/* ── Progress Bar ─────────────────────────────────────────────── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm font-mono text-muted-foreground">
            <span>
              {job.failedResultCount + job.successfulResultCount}/{total} inputs
            </span>
            <span>{successPercent + failurePercent}%</span>
          </div>

          <div className="w-full bg-muted rounded-xs h-3 overflow-hidden flex">
            <div
              className="bg-blue-500 h-full transition-all duration-500"
              style={{ width: `${successPercent}%` }}
            />
            <div
              className="bg-red-500 h-full transition-all duration-500"
              style={{ width: `${failurePercent}%` }}
            />
          </div>

          <div className="flex items-center gap-4 text-sm font-mono text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
              {`Extracted ${successPercent}% (${job.successfulResultCount})`}
            </span>
            {failurePercent > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                {`Failed ${failurePercent}% (${job.failedResultCount})`}
              </span>
            )}
          </div>

          {job.currentInputLabel && status === "running" && (
            <p className="text-xs font-mono text-muted-foreground truncate flex items-center gap-1.5">
              <Cpu className="size-3 text-blue-400 shrink-0" />
              Processing: <span className="text-foreground">{job.currentInputLabel}</span>
            </p>
          )}
          {job.lastSuccessfulInputLabel && (
            <p className="text-xs font-mono text-muted-foreground truncate">
              Last successful input:{" "}
              <span className="text-foreground">{job.lastSuccessfulInputLabel}</span>
            </p>
          )}
        </div>
        <Separator />

        {/* ── Tabs ────────────────────────────────────────────────────── */}
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
            {/* Only show Failed tab when there are actually failed results */}
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
                  {hasAnyResults
                    ? "Waiting for a successful result..."
                    : "Waiting for the first result..."}
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
                {/* ── Filter controls row ─────────────────────────────── */}
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                    {activeFilterCount > 0 && (
                      <>
                        <span>
                          {filteredSuccessfulResults.length} of {successfulResults.length} match
                        </span>
                        <span className="text-muted-foreground/40">·</span>
                        <button
                          onClick={handleClearAll}
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
                      onClick={() => setFilterSheetOpen(true)}
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
                      onClick={handleDownloadJSON}
                      className="font-mono text-xs gap-1.5 rounded-sm cursor-pointer h-7 px-2"
                    >
                      <Download className="w-3 h-3" />
                      Export JSON
                    </Button>
                  </div>
                </div>

                {/* ── Active filter tags ──────────────────────────────── */}
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
                            onClick={() => handleToggleValue(key, value)}
                            className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0 leading-none"
                          >
                            <X className="size-3.5" />
                          </button>
                        </span>
                      )),
                    )}
                  </div>
                )}

                {/* ── Result cards ────────────────────────────────────── */}
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
                      page={successfulResultsPage}
                      totalItems={filteredSuccessfulResults.length}
                      pageSize={RESULT_PAGE_SIZE}
                      itemLabel="result"
                      onPageChange={setSuccessfulResultsPage}
                    />
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {failedResults.length > 0 && (
            <TabsContent value="failed" className="mt-3">
              <div className="mb-3 flex items-start justify-between gap-3 rounded-sm border border-red-500/20 bg-red-500/5 p-3">
                <div className="space-y-1">
                  <p className="font-mono text-xs text-foreground">Failed inputs are preserved.</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    They are skipped by Start until you clear failed results. Successful results
                    stay untouched.
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
                  page={failedResultsPage}
                  totalItems={failedResults.length}
                  pageSize={RESULT_PAGE_SIZE}
                  itemLabel="failed result"
                  onPageChange={setFailedResultsPage}
                />
              </div>
            </TabsContent>
          )}

          <TabsContent value="instruction" className="mt-3 space-y-3">
            <div className="space-y-1">
              <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
                Title
              </p>
              <p className="font-mono text-sm text-foreground">{instructionTitle}</p>
            </div>
            <Separator />
            <div className="space-y-1.5">
              <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
                PROMPT TEMPLATE
              </p>
              <pre className="h-150 overflow-auto font-mono text-xs text-foreground whitespace-pre-wrap leading-relaxed bg-muted/40 border border-border rounded-lg p-3">
                {job.instruction.prompt}
              </pre>
            </div>
            {job.instruction.outputSchema && (
              <>
                <Separator />
                <div className="flex-1 rounded-md border border-border overflow-hidden flex flex-col">
                  {/* Title bar */}
                  <div className="bg-muted/60 border-b border-border px-3 py-2 flex items-center gap-2 shrink-0">
                    <span className="size-2.5 rounded-full bg-red-400/70" />
                    <span className="size-2.5 rounded-full bg-yellow-400/70" />
                    <span className="size-2.5 rounded-full bg-green-400/70" />
                    <span className="ml-2 font-mono text-[10px] text-muted-foreground/50 uppercase tracking-wider">
                      Output Schema
                    </span>
                  </div>
                  {/* Code body */}
                  <pre className="bg-preview-window flex-1 font-mono text-[11px] p-3 text-muted-foreground overflow-auto whitespace-pre leading-relaxed">
                    {JSON.stringify(schemaToSimplePreview(job.instruction.outputSchema!), null, 2)}
                  </pre>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Filter Sheet ────────────────────────────────────────────────── */}
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
