"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { InstructionPanel } from "@/components/features/instructions/InstructionPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/shadcn_ui/tabs";
import { ExtractionJobPanel } from "@/components/features/extraction-jobs/ExtractionJobPanel";
import { DatasetPanel } from "@/components/features/datasets/DatasetPanel";
import { RunningBanner } from "@/components/app/RunningBanner";
import { GoToTopButton } from "@/components/app/GoToTopButton";
import { Cpu, FileText, Database, RefreshCcw, Wifi } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/shadcn_ui/tooltip";
import { ExtractionJob, ExtractionResult, RightPanelMode } from "@/components/features/extraction-jobs/types";
import {
  fetchExtractionJobs,
  useExtractionJobsQuery,
} from "@/components/features/extraction-jobs/hooks/useExtractionJobs";
import {
  fetchExtractionJobResults,
  type ExtractionJobResultsSnapshot,
  useExtractionJobResultsQuery,
} from "@/components/features/extraction-jobs/hooks/useExtractionJobResults";
import {
  getMutationErrorMessage,
  useDeleteExtractionResultMutation,
  useStopExtractionJobMutation,
} from "@/components/features/extraction-jobs/hooks/useExtractionJobMutations";
import type { ExtractionJobEvent, ExtractionJobEventJobPatch } from "@/lib/extractionJobEvents";
import { queryKeys } from "@/lib/queryKeys";
import { Button } from "@/components/shadcn_ui/button";
import { ThemeToggle } from "@/components/app/ThemeToggle";
import Logo from "@/components/app/Logo";

function prependUniqueResult(
  results: ExtractionResult[],
  result: ExtractionResult,
): ExtractionResult[] {
  if (results.some((existing) => existing.id === result.id)) return results;
  return [result, ...results];
}

const EMPTY_RESULTS: ExtractionResult[] = [];

export default function Home() {
  const queryClient = useQueryClient();
  const extractionJobsQuery = useExtractionJobsQuery();
  const jobs = useMemo(() => extractionJobsQuery.data ?? [], [extractionJobsQuery.data]);
  const jobsLoading = extractionJobsQuery.isLoading;
  const jobsError = extractionJobsQuery.isError;
  const stopExtractionJobMutation = useStopExtractionJobMutation();
  const deleteExtractionResultMutation = useDeleteExtractionResultMutation();

  const [selectedExtractionJobId, setSelectedExtractionJobId] = useState<string | null>(null);
  const selectedResultsQuery = useExtractionJobResultsQuery(selectedExtractionJobId);
  const selectedResultsSnapshot = selectedResultsQuery.data ?? null;
  const successfulResults = selectedResultsSnapshot?.successfulResults ?? EMPTY_RESULTS;
  const failedResults = selectedResultsSnapshot?.failedResults ?? EMPTY_RESULTS;
  const resultsLoading = selectedExtractionJobId !== null && selectedResultsQuery.isLoading;
  const resultsError = selectedExtractionJobId !== null && selectedResultsQuery.isError;
  const [extractionJobPanelMode, setExtractionJobPanelMode] =
    useState<RightPanelMode>("empty");
  const [stopping, setStopping] = useState(false);
  const [ollamaOnline, setOllamaOnline] = useState<boolean | null>(null);

  // ── Refs: avoid stale closures inside SSE onmessage handlers ─────────────
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const initialRunningReconnectRef = useRef(false);
  const viewedJobIdRef = useRef<string | null>(null); // extraction job currently being viewed

  const updateJobs = useCallback(
    (updater: (jobs: ExtractionJob[]) => ExtractionJob[]) => {
      queryClient.setQueryData<ExtractionJob[]>(queryKeys.extractionJobs, (current) =>
        updater(current ?? []),
      );
    },
    [queryClient],
  );

  const updateResultsSnapshot = useCallback(
    (
      jobId: string,
      updater: (snapshot: ExtractionJobResultsSnapshot) => ExtractionJobResultsSnapshot,
    ) => {
      queryClient.setQueryData<ExtractionJobResultsSnapshot>(
        queryKeys.extractionJobResults(jobId),
        (current) => (current ? updater(current) : current),
      );
    },
    [queryClient],
  );

  const patchJobCaches = useCallback(
    (jobId: string, jobPatch: ExtractionJobEventJobPatch) => {
      updateJobs((prev) =>
        prev.map((job) => (job.id === jobId ? { ...job, ...jobPatch } : job)),
      );
      updateResultsSnapshot(jobId, (snapshot) => ({
        ...snapshot,
        successfulResultCount:
          jobPatch.successfulResultCount ?? snapshot.successfulResultCount,
        failedResultCount: jobPatch.failedResultCount ?? snapshot.failedResultCount,
        job: {
          ...snapshot.job,
          ...jobPatch,
        },
      }));
    },
    [updateJobs, updateResultsSnapshot],
  );

  const refreshJobs = useCallback(async (): Promise<ExtractionJob[]> => {
    try {
      return await queryClient.fetchQuery({
        queryKey: queryKeys.extractionJobs,
        queryFn: fetchExtractionJobs,
        staleTime: 0,
      });
    } catch {
      console.error("Failed to fetch extraction jobs");
      return queryClient.getQueryData<ExtractionJob[]>(queryKeys.extractionJobs) ?? [];
    }
  }, [queryClient]);

  const refreshResultsSnapshot = useCallback(async (id: string) => {
    try {
      const snapshot = await queryClient.fetchQuery({
        queryKey: queryKeys.extractionJobResults(id),
        queryFn: () => fetchExtractionJobResults(id),
        staleTime: 0,
      });
      if (viewedJobIdRef.current !== id) return null;
      if (snapshot.job) {
        updateJobs((prev) => prev.map((job) => (job.id === id ? snapshot.job : job)));
      }
      return snapshot;
    } catch {
      console.error("Failed to fetch extraction results snapshot");
      return null;
    }
  }, [queryClient, updateJobs]);

  useEffect(() => {
    const selectedJob = selectedResultsSnapshot?.job;
    if (!selectedJob) return;

    updateJobs((prev) =>
      prev.map((job) => (job.id === selectedJob.id ? selectedJob : job)),
    );
  }, [selectedResultsSnapshot?.job, updateJobs]);

  // ── SSE stream management ─────────────────────────────────────────────────
  const openSSEStream = useCallback(
    (jobId: string) => {
      if (reconnectTimeoutRef.current !== null) {
        window.clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      // Close any existing stream first
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      let reconnectAttempt = 0;

      const connect = () => {
        const es = new EventSource(`/api/extraction-jobs/${jobId}/events`);
        eventSourceRef.current = es;

        es.onmessage = (e: MessageEvent) => {
          let event: ExtractionJobEvent;
          try {
            event = JSON.parse(e.data as string) as ExtractionJobEvent;
          } catch {
            return;
          }

          switch (event.type) {
            case "heartbeat":
              // Keep-alive ping — no UI action needed
              break;

            case "started":
              reconnectAttempt = 0;
              patchJobCaches(jobId, event.jobPatch);
              break;

            case "processing":
              reconnectAttempt = 0;
              patchJobCaches(jobId, event.jobPatch);
              break;

            case "input_success":
              reconnectAttempt = 0;
              patchJobCaches(jobId, event.jobPatch);
              // Append the result only if the user is viewing this job
              if (viewedJobIdRef.current === jobId) {
                const result = event.result as ExtractionResult;
                updateResultsSnapshot(jobId, (snapshot) => ({
                  ...snapshot,
                  successfulResultCount:
                    event.jobPatch.successfulResultCount ?? snapshot.successfulResultCount,
                  failedResultCount:
                    event.jobPatch.failedResultCount ?? snapshot.failedResultCount,
                  job: {
                    ...snapshot.job,
                    ...event.jobPatch,
                  },
                  successfulResults: prependUniqueResult(snapshot.successfulResults, result),
                }));
              }
              break;

            case "input_failed":
              reconnectAttempt = 0;
              patchJobCaches(jobId, event.jobPatch);
              if (viewedJobIdRef.current === jobId) {
                const result = event.result as ExtractionResult;
                updateResultsSnapshot(jobId, (snapshot) => ({
                  ...snapshot,
                  successfulResultCount:
                    event.jobPatch.successfulResultCount ?? snapshot.successfulResultCount,
                  failedResultCount:
                    event.jobPatch.failedResultCount ?? snapshot.failedResultCount,
                  job: {
                    ...snapshot.job,
                    ...event.jobPatch,
                  },
                  failedResults: prependUniqueResult(snapshot.failedResults, result),
                }));
              }
              break;

            case "input_skipped":
              reconnectAttempt = 0;
              patchJobCaches(jobId, event.jobPatch);
              break;

            case "stopped":
            case "completed":
              patchJobCaches(jobId, event.jobPatch);
              es.close();
              if (eventSourceRef.current === es) {
                eventSourceRef.current = null;
              }
              if (reconnectTimeoutRef.current !== null) {
                window.clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
              }
              // Final sync from DB to pick up any fields we don't track in SSE
              refreshJobs();
              if (viewedJobIdRef.current === jobId) {
                refreshResultsSnapshot(jobId);
              }
              break;
          }
        };

        es.onerror = () => {
          es.close();
          if (eventSourceRef.current === es) {
            eventSourceRef.current = null;
          }

          reconnectAttempt++;
          if (reconnectAttempt > 5) {
            refreshJobs().then((latestJobs) => {
              const latestJob = latestJobs.find((job) => job.id === jobId);
              if (!latestJob?.isRunning && viewedJobIdRef.current === jobId) {
                refreshResultsSnapshot(jobId);
              }
            });
            return;
          }

          const reconnectDelayMs = Math.min(1_000 * reconnectAttempt, 5_000);
          reconnectTimeoutRef.current = window.setTimeout(() => {
            reconnectTimeoutRef.current = null;
            refreshJobs().then((latestJobs) => {
              const latestJob = latestJobs.find((job) => job.id === jobId);
              if (latestJob?.isRunning) {
                connect();
              } else if (viewedJobIdRef.current === jobId) {
                refreshResultsSnapshot(jobId);
              }
            });
          }, reconnectDelayMs);
        };
      };

      connect();
    },
    [patchJobCaches, refreshJobs, refreshResultsSnapshot, updateResultsSnapshot],
  );
  // ── Called when user selects an extraction job to view ───────────────────
  const handleSelectJob = useCallback(async (id: string) => {
    viewedJobIdRef.current = id;
    await refreshResultsSnapshot(id);
  }, [refreshResultsSnapshot]);

  const handleDeletedJob = useCallback((id: string) => {
    if (viewedJobIdRef.current === id) {
      viewedJobIdRef.current = null;
    }
    queryClient.removeQueries({ queryKey: queryKeys.extractionJobResults(id) });
  }, [queryClient]);

  const handleDeletedResult = useCallback(
    async (jobId: string, resultId: string): Promise<boolean> => {
      try {
        const data = await deleteExtractionResultMutation.mutateAsync({ jobId, resultId });

        updateResultsSnapshot(jobId, (snapshot) => ({
          ...snapshot,
          successfulResultCount: data.successfulResultCount ?? snapshot.successfulResultCount,
          failedResultCount: data.failedResultCount ?? snapshot.failedResultCount,
          job: {
            ...snapshot.job,
            successfulResultCount:
              data.successfulResultCount ?? snapshot.job.successfulResultCount,
            failedResultCount: data.failedResultCount ?? snapshot.job.failedResultCount,
            totalInputCount: data.totalInputCount ?? snapshot.job.totalInputCount,
          },
          successfulResults: snapshot.successfulResults.filter((result) => result.id !== resultId),
          failedResults: snapshot.failedResults.filter((result) => result.id !== resultId),
        }));
        updateJobs((prev) =>
          prev.map((job) =>
            job.id === jobId
              ? {
                  ...job,
                  successfulResultCount:
                    data.successfulResultCount ?? job.successfulResultCount,
                  failedResultCount: data.failedResultCount ?? job.failedResultCount,
                  totalInputCount: data.totalInputCount ?? job.totalInputCount,
                }
              : job,
          ),
        );

        await refreshJobs();
        if (viewedJobIdRef.current === jobId) {
          await refreshResultsSnapshot(jobId);
        }

        toast.success(data.message || "Extraction result deleted.");
        return true;
      } catch (error) {
        toast.error(getMutationErrorMessage(error, "Failed to delete extraction result."));
        return false;
      }
    },
    [
      deleteExtractionResultMutation,
      refreshJobs,
      refreshResultsSnapshot,
      updateJobs,
      updateResultsSnapshot,
    ],
  );

  const handleClearedJobSelection = useCallback(() => {
    viewedJobIdRef.current = null;
  }, []);

  const handleUpdatedExtractionJob = useCallback(
    (updatedJob: ExtractionJob) => {
      updateResultsSnapshot(updatedJob.id, (snapshot) => ({
        ...snapshot,
        successfulResultCount: updatedJob.successfulResultCount,
        failedResultCount: updatedJob.failedResultCount,
        job: updatedJob,
      }));
    },
    [updateResultsSnapshot],
  );
  // ── Reconnect SSE if a job is already running on page load ────────────────
  // Runs once when the initial extraction-jobs query completes.
  useEffect(() => {
    if (jobsLoading || jobsError || initialRunningReconnectRef.current) return;
    initialRunningReconnectRef.current = true;

    const runningJob = jobs.find((job) => job.isRunning);
    if (runningJob && !eventSourceRef.current) {
      openSSEStream(runningJob.id);
      setSelectedExtractionJobId(runningJob.id);
      setExtractionJobPanelMode("view");
      // Also select the running job so viewedJobIdRef is set and the snapshot
      // loads — otherwise input_success/input_failed events are dropped because
      // viewedJobIdRef.current is null and results never appear on refresh.
      handleSelectJob(runningJob.id);
    }
  }, [handleSelectJob, jobs, jobsError, jobsLoading, openSSEStream]);

  // ── Cleanup SSE stream on unmount ─────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current !== null) {
        window.clearTimeout(reconnectTimeoutRef.current);
      }
      eventSourceRef.current?.close();
    };
  }, []);

  // ── Ollama health check — once on mount ───────────────────────────────────
  async function checkOllama() {
    setOllamaOnline(null);
    try {
      const res = await fetch("/api/ollama/models");
      setOllamaOnline(res.ok);
    } catch {
      setOllamaOnline(false);
    }
  }

  useEffect(() => {
    const initOllamaCheck = async () => {
      await checkOllama();
    };
    initOllamaCheck();
  }, []);

  // ── Called after a successful Start in the panel ─────────────────────────
  const handleStarted = useCallback(
    (jobId: string, jobSnapshot?: ExtractionJob) => {
      // Optimistically mark as running so the banner appears immediately,
      // without waiting for the SSE "started" event (which can be missed if
      // the runner emits it before the EventSource connects).
      updateJobs((prev) =>
        prev.map((job) => (job.id === jobId ? (jobSnapshot ?? { ...job, isRunning: true }) : job)),
      );
      openSSEStream(jobId);
    },
    [openSSEStream, updateJobs],
  );

  // ── Stop handler — owned here so banner and panel share the same action ───
  async function handleStop() {
    if (stopping) return;
    const runningJob = jobs.find((job) => job.isRunning);
    if (!runningJob) return;
    setStopping(true);
    try {
      const data = await stopExtractionJobMutation.mutateAsync(runningJob.id);
      toast.success(data.message || "Stop requested.");
      // Optimistically clear running state so the banner disappears immediately.
      // If the SSE stream is dead, the "stopped" event will never arrive and
      // the banner would hang forever. refreshJobs() syncs final DB state.
      updateJobs((prev) =>
        prev.map((job) =>
          job.id === runningJob.id ? { ...job, isRunning: false, currentInputLabel: null } : job,
        ),
      );
      window.setTimeout(() => {
        refreshJobs();
        if (viewedJobIdRef.current === runningJob.id) {
          refreshResultsSnapshot(runningJob.id);
        }
      }, 1_500);
    } catch (error) {
      toast.error(getMutationErrorMessage(error, "Failed to stop the extraction job."));
    } finally {
      setStopping(false);
    }
  }

  const runningJob = jobs.find((job) => job.isRunning) ?? null;

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="border-b border-border bg-surface-panel-header px-3 py-3 sm:px-6 sm:py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Logo className="h-7 w-auto" />
            <span className="font-mono text-sm font-semibold tracking-widest uppercase">
              Parse Engine
            </span>
          </div>
          <ThemeToggle />
        </div>

        <div className="flex items-center gap-2">
          {ollamaOnline !== null && (
            <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    {ollamaOnline ? (
                      <span className="flex items-center gap-1.5 font-mono text-[11px] text-green-400/80 cursor-default">
                        <Wifi className="size-4" />
                        Ollama running
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 font-mono text-[11px] text-red-400 cursor-help">
                        <span className="size-4 rounded-full bg-red-400/20 border border-red-400/40 flex items-center justify-center text-[10px] font-bold leading-none">
                          !
                        </span>
                        Ollama offline
                      </span>
                    )}
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    {ollamaOnline
                      ? "Ollama is running"
                      : "Ollama is unavailable. Make sure it is installed and running before starting an extraction job."}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      onClick={checkOllama}
                      variant="ghost"
                      size="icon"
                      className="size-6 text-muted-foreground hover:text-foreground cursor-pointer"
                      aria-label="Refresh Ollama status"
                    >
                      <RefreshCcw className="size-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Refresh Ollama status</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </>
          )}
        </div>
      </header>

      {/* ── Running Banner — sticky, only visible when an extraction job is running ── */}
      <RunningBanner runningJob={runningJob} onStop={handleStop} stopping={stopping} />

      {/* ── Main Content ──────────────────────────────────────────────────── */}
      <main className="flex-1 min-h-0 px-3 pt-4 pb-6 sm:px-6 sm:pt-6 sm:pb-20 overflow-hidden">
        <Tabs defaultValue="extraction-jobs" className="h-full flex flex-col">
          {/* Tab Navigation */}
          <TabsList className="mb-4 sm:mb-6 shrink-0 grid h-auto w-full grid-cols-3">
            <TabsTrigger
              value="extraction-jobs"
              className="gap-1 font-mono text-[11px] uppercase tracking-normal sm:gap-2 sm:text-sm sm:tracking-wider data-[state=active]:text-blue-400"
            >
              <Cpu className="size-4 sm:size-5" />
              <span className="sm:hidden">Jobs</span>
              <span className="hidden sm:inline">Extraction Jobs</span>
            </TabsTrigger>
            <TabsTrigger
              value="datasets"
              className="gap-1 font-mono text-[11px] uppercase tracking-normal sm:gap-2 sm:text-sm sm:tracking-wider data-[state=active]:text-blue-400"
            >
              <Database className="size-4 sm:size-5" />
              <span className="sm:hidden">Data</span>
              <span className="hidden sm:inline">Datasets</span>
            </TabsTrigger>
            <TabsTrigger
              value="instructions"
              className="gap-1 font-mono text-[11px] uppercase tracking-normal sm:gap-2 sm:text-sm sm:tracking-wider data-[state=active]:text-blue-400"
            >
              <FileText className="size-4 sm:size-5" />
              Instructions
            </TabsTrigger>
          </TabsList>

          {/* Tab: Extraction Jobs */}
          <TabsContent value="extraction-jobs" className="flex-1 overflow-hidden mt-0">
            <ExtractionJobPanel
              jobs={jobs}
              updateJobs={updateJobs}
              jobsLoading={jobsLoading}
              jobsError={jobsError}
              onRetryJobs={() => {
                void extractionJobsQuery.refetch();
              }}
              selectedId={selectedExtractionJobId}
              runningJobId={runningJob?.id ?? null}
              stopping={stopping}
              mode={extractionJobPanelMode}
              onSelectedIdChange={setSelectedExtractionJobId}
              onModeChange={setExtractionJobPanelMode}
              successfulResults={successfulResults}
              failedResults={failedResults}
              resultsLoading={resultsLoading}
              resultsError={resultsError}
              onRetryResults={() => {
                void selectedResultsQuery.refetch();
              }}
              onSelectJob={handleSelectJob}
              onStarted={handleStarted}
              onStop={handleStop}
              onDeletedJob={handleDeletedJob}
              onDeletedResult={handleDeletedResult}
              onClearedSelection={handleClearedJobSelection}
              onUpdatedJob={handleUpdatedExtractionJob}
            />
          </TabsContent>

          {/* Tab: Datasets */}
          <TabsContent value="datasets" className="flex-1 overflow-hidden mt-0">
            <DatasetPanel />
          </TabsContent>

          {/* Tab: Instructions */}
          <TabsContent value="instructions" className="flex-1 overflow-hidden mt-0">
            <InstructionPanel />
          </TabsContent>
        </Tabs>
      </main>
      <GoToTopButton />
    </div>
  );
}
