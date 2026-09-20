"use client";

import { useState } from "react";
import { toast } from "react-toastify";
import { Button } from "@/components/shadcn_ui/button";
import { ScrollArea } from "@/components/shadcn_ui/scroll-area";
import { WorkspacePanelShell } from "@/components/WorkspacePanelShell";
import { Plus, Loader2 } from "lucide-react";
import { ExtractionJob, ExtractionResult, RightPanelMode } from "./extraction-job/types";
import { ExtractionJobCard } from "./extraction-job/ExtractionJobCard";
import { ExtractionJobDetails } from "./extraction-job/ExtractionJobDetails";
import { CreateExtractionJobForm } from "./extraction-job/CreateExtractionJobForm";

// ── Right Panel: Empty State ──────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm font-mono">
      ← Select an extraction job to view details
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface ExtractionJobPanelProps {
  jobs: ExtractionJob[];
  updateJobs: (updater: (jobs: ExtractionJob[]) => ExtractionJob[]) => void;
  hasRunningJob: boolean;
  jobsLoading: boolean;
  jobsError: boolean;
  onRetryJobs: () => void;
  selectedId: string | null;
  mode: RightPanelMode;
  onSelectedIdChange: (id: string | null) => void;
  onModeChange: (mode: RightPanelMode) => void;
  // Result state managed by parent (fed by SSE)
  successfulResults: ExtractionResult[];
  failedResults: ExtractionResult[];
  // Callbacks to parent
  onSelectJob: (id: string) => Promise<void>; // triggers snapshot fetch + viewedJobId tracking
  onStarted: (jobId: string, job?: ExtractionJob) => void; // triggers SSE stream open after successful start
  onDeletedJob: (id: string) => void;
  onDeletedResult: (jobId: string, resultId: string) => Promise<boolean>;
  onClearedSelection: () => void;
}

// ── Main ExtractionJobPanel ─────────────────────────────────────────────────────
export function ExtractionJobPanel({
  jobs,
  updateJobs,
  hasRunningJob,
  jobsLoading,
  jobsError,
  onRetryJobs,
  selectedId,
  mode,
  onSelectedIdChange,
  onModeChange,
  successfulResults,
  failedResults,
  onSelectJob,
  onStarted,
  onDeletedJob,
  onDeletedResult,
  onClearedSelection,
}: ExtractionJobPanelProps) {
  const [actionLoading, setActionLoading] = useState(false);
  const [retryFailedLoading, setRetryFailedLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function handleSelectJob(id: string) {
    onSelectedIdChange(id);
    onModeChange("view");
    await onSelectJob(id);
  }

  function handleBackToList() {
    onSelectedIdChange(null);
    onModeChange("empty");
    onClearedSelection();
  }

  function handleOpenCreate() {
    onModeChange("create");
  }
  function handleCancelCreate() {
    onModeChange(selectedId ? "view" : "empty");
  }

  async function handleCreated(newJob: ExtractionJob) {
    updateJobs((prev) => [newJob, ...prev]);
    onSelectedIdChange(newJob.id);
    onModeChange("view");
    // Notify parent to clear results and set viewedJobId for the new job
    await onSelectJob(newJob.id);
  }

  async function handleStart() {
    if (!selectedId) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/extraction-jobs/${selectedId}/start`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to start the extraction job.");
        return;
      }
      toast.success("Extraction job started.");
      // Open SSE immediately — SSE is the source of truth while running.
      // Do not refetch here: the start endpoint already returns the updated job
      // snapshot, and a late stale response would overwrite the optimistic banner.
      onStarted(selectedId, data.job);
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRetryFailed() {
    if (!selectedId) return;

    setRetryFailedLoading(true);
    try {
      const res = await fetch(`/api/extraction-jobs/${selectedId}/retry-failed`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to clear failed results.");
        return;
      }

      updateJobs((prev) =>
        prev.map((job) =>
          job.id === selectedId
            ? {
                ...job,
                successfulResultCount: data.successfulResultCount ?? job.successfulResultCount,
                failedResultCount: data.failedResultCount ?? 0,
                totalInputCount: data.totalInputCount ?? job.totalInputCount,
                isRunning: false,
                currentInputLabel: null,
              }
            : job,
        ),
      );

      await onSelectJob(selectedId);
      toast.success(data.message || "Failed results cleared. Click Start to retry them.");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setRetryFailedLoading(false);
    }
  }

  async function handleDeleteJob(): Promise<boolean> {
    if (!selectedId) return false;

    const jobId = selectedId;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/extraction-jobs/${jobId}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to delete extraction job.");
        return false;
      }

      updateJobs((prev) => prev.filter((job) => job.id !== jobId));
      onDeletedJob(jobId);
      onSelectedIdChange(null);
      onModeChange("empty");
      toast.success(data.message || "Extraction job deleted.");
      return true;
    } catch {
      toast.error("Network error. Please try again.");
      return false;
    } finally {
      setDeleteLoading(false);
    }
  }

  const selectedJob = jobs.find((job) => job.id === selectedId) ?? null;

  // ── Sort: running job always first, preserve original order for the rest ──
  const sortedJobs = [...jobs].sort((a, b) => {
    if (a.isRunning && !b.isRunning) return -1;
    if (!a.isRunning && b.isRunning) return 1;
    return 0;
  });

  return (
    <WorkspacePanelShell
      showDetail={mode !== "empty"}
      backLabel="Extraction Jobs"
      onBack={handleBackToList}
      list={
        <>
          <div className="flex items-center justify-between shrink-0">
            <Button
              size="sm"
              onClick={handleOpenCreate}
              className="font-mono text-xs gap-1.5 bg-green-600 hover:bg-green-500 text-white"
            >
              <Plus className="w-3.5 h-3.5" />
              New
            </Button>
            <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
              {jobs.length} {jobs.length === 1 ? "Extraction Job" : "Extraction Jobs"}
            </span>
          </div>

          <ScrollArea className="flex-1">
            <div className="space-y-2">
              {jobsLoading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              )}
              {!jobsLoading && jobsError && (
                <div className="py-8 text-center font-mono text-xs text-muted-foreground">
                  <p>Failed to load extraction jobs.</p>
                  <button
                    type="button"
                    onClick={onRetryJobs}
                    className="mt-2 text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                  >
                    Retry
                  </button>
                </div>
              )}
              {!jobsLoading && !jobsError && jobs.length === 0 && (
                <p className="text-center text-xs text-muted-foreground font-mono py-8">
                  No extraction jobs yet.
                  <br />
                  Create your first one.
                </p>
              )}
              {!jobsLoading &&
                !jobsError &&
                sortedJobs.map((job) => (
                  <ExtractionJobCard
                    key={job.id}
                    job={job}
                    isSelected={selectedId === job.id}
                    onClick={() => handleSelectJob(job.id)}
                  />
                ))}
            </div>
          </ScrollArea>
        </>
      }
      detail={
        <>
          {mode === "empty" && <EmptyState />}

          {mode === "view" && selectedJob && (
            <ExtractionJobDetails
              key={selectedJob.id}
              job={selectedJob}
              successfulResults={successfulResults}
              failedResults={failedResults}
              hasRunningJob={hasRunningJob}
              actionLoading={actionLoading}
              onStart={handleStart}
              retryFailedLoading={retryFailedLoading}
              onRetryFailed={handleRetryFailed}
              deleteLoading={deleteLoading}
              onDeleteJob={handleDeleteJob}
              onDeleteResult={(resultId) => onDeletedResult(selectedJob.id, resultId)}
            />
          )}

          {mode === "create" && (
            <CreateExtractionJobForm onCreated={handleCreated} onCancel={handleCancelCreate} />
          )}
        </>
      }
    />
  );
}
