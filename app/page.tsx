"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "react-toastify";
import { InstructionPanel } from "@/components/InstructionPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/shadcn_ui/tabs";
import { ExtractionJobPanel } from "@/components/ExtractionJobPanel";
import { DatasetPanel } from "@/components/DatasetPanel";
import { RunningBanner } from "@/components/RunningBanner";
import { Cpu, FileText, Database, RefreshCcw, Wifi } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/shadcn_ui/tooltip";
import { ExtractionJob, ExtractionResult } from "@/components/extraction-job/types";
import type { ExtractionJobEvent } from "@/lib/extractionJobEvents";
import { Button } from "@/components/shadcn_ui/button";
import Logo from "@/components/Logo";

function dedupeResults(results: ExtractionResult[]): ExtractionResult[] {
  const seen = new Set<string>();
  return results.filter((result) => {
    if (seen.has(result.id)) return false;
    seen.add(result.id);
    return true;
  });
}

function prependUniqueResult(
  results: ExtractionResult[],
  result: ExtractionResult,
): ExtractionResult[] {
  if (results.some((existing) => existing.id === result.id)) return results;
  return [result, ...results];
}

export default function Home() {
  const [jobs, setJobs] = useState<ExtractionJob[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [stopping, setStopping] = useState(false);
  const [ollamaOnline, setOllamaOnline] = useState<boolean | null>(null);

  // ── Result state lifted here so SSE can append to it ──────────────────────
  const [successfulResults, setSuccessfulResults] = useState<ExtractionResult[]>([]);
  const [failedResults, setFailedResults] = useState<ExtractionResult[]>([]);

  // ── Refs: avoid stale closures inside SSE onmessage handlers ─────────────
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const viewedJobIdRef = useRef<string | null>(null); // extraction job currently being viewed

  const fetchJobs = useCallback(async (): Promise<ExtractionJob[]> => {
    try {
      const res = await fetch("/api/extraction-jobs");
      const data = await res.json();
      const nextJobs = Array.isArray(data) ? data : [];
      setJobs(nextJobs);
      return nextJobs;
    } catch {
      console.error("Failed to fetch extraction jobs");
      return [];
    } finally {
      setJobsLoading(false);
    }
  }, []);

  const fetchResultsSnapshot = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/extraction-jobs/${id}/results`);
      const data = await res.json();
      if (viewedJobIdRef.current !== id) return;
      setSuccessfulResults(dedupeResults(data.successfulResults ?? []));
      setFailedResults(dedupeResults(data.failedResults ?? []));
    } catch {
      console.error("Failed to fetch extraction results snapshot");
    }
  }, []);

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
              // Runner confirmed started — mark the job as running in local state
              setJobs((prev) =>
                prev.map((job) => (job.id === jobId ? { ...job, isRunning: true } : job)),
              );
              break;

            case "processing":
              reconnectAttempt = 0;
              setJobs((prev) =>
                prev.map((job) =>
                  job.id === jobId
                    ? {
                        ...job,
                        currentInputLabel: event.currentInputLabel,
                        successfulResultCount: event.successfulResultCount,
                        failedResultCount: event.failedResultCount,
                      }
                    : job,
                ),
              );
              break;

            case "input_success":
              reconnectAttempt = 0;
              setJobs((prev) =>
                prev.map((job) =>
                  job.id === jobId
                    ? {
                        ...job,
                        successfulResultCount: event.successfulResultCount,
                        failedResultCount: event.failedResultCount,
                        lastSuccessfulInputLabel: event.lastSuccessfulInputLabel,
                        currentInputLabel: null,
                      }
                    : job,
                ),
              );
              // Append the result only if the user is viewing this job
              if (viewedJobIdRef.current === jobId) {
                setSuccessfulResults((prev) =>
                  prependUniqueResult(prev, event.result as ExtractionResult),
                );
              }
              break;

            case "input_failed":
              reconnectAttempt = 0;
              setJobs((prev) =>
                prev.map((job) =>
                  job.id === jobId
                    ? {
                        ...job,
                        successfulResultCount: event.successfulResultCount,
                        failedResultCount: event.failedResultCount,
                        currentInputLabel: null,
                      }
                    : job,
                ),
              );
              if (viewedJobIdRef.current === jobId) {
                setFailedResults((prev) =>
                  prependUniqueResult(prev, event.result as ExtractionResult),
                );
              }
              break;

            case "input_skipped":
              reconnectAttempt = 0;
              setJobs((prev) =>
                prev.map((job) =>
                  job.id === jobId
                    ? {
                        ...job,
                        successfulResultCount: event.successfulResultCount,
                        failedResultCount: event.failedResultCount,
                      }
                    : job,
                ),
              );
              break;

            case "stopped":
            case "completed":
              setJobs((prev) =>
                prev.map((job) =>
                  job.id === jobId
                    ? {
                        ...job,
                        isRunning: false,
                        currentInputLabel: null,
                        successfulResultCount: event.successfulResultCount,
                        failedResultCount: event.failedResultCount,
                        totalProcessingTimeSeconds: event.totalProcessingTimeSeconds,
                      }
                    : job,
                ),
              );
              es.close();
              if (eventSourceRef.current === es) {
                eventSourceRef.current = null;
              }
              if (reconnectTimeoutRef.current !== null) {
                window.clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
              }
              // Final sync from DB to pick up any fields we don't track in SSE
              fetchJobs();
              if (viewedJobIdRef.current === jobId) {
                fetchResultsSnapshot(jobId);
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
            fetchJobs().then((latestJobs) => {
              const latestJob = latestJobs.find((job) => job.id === jobId);
              if (!latestJob?.isRunning && viewedJobIdRef.current === jobId) {
                fetchResultsSnapshot(jobId);
              }
            });
            return;
          }

          const reconnectDelayMs = Math.min(1_000 * reconnectAttempt, 5_000);
          reconnectTimeoutRef.current = window.setTimeout(() => {
            reconnectTimeoutRef.current = null;
            fetchJobs().then((latestJobs) => {
              const latestJob = latestJobs.find((job) => job.id === jobId);
              if (latestJob?.isRunning) {
                connect();
              } else if (viewedJobIdRef.current === jobId) {
                fetchResultsSnapshot(jobId);
              }
            });
          }, reconnectDelayMs);
        };
      };

      connect();
    },
    [fetchJobs, fetchResultsSnapshot],
  );
  // ── Called when user selects an extraction job to view ───────────────────
  const handleSelectJob = useCallback(async (id: string) => {
    viewedJobIdRef.current = id;
    setSuccessfulResults([]);
    setFailedResults([]);
    await fetchResultsSnapshot(id);
  }, [fetchResultsSnapshot]);

  const handleDeletedJob = useCallback((id: string) => {
    if (viewedJobIdRef.current === id) {
      viewedJobIdRef.current = null;
    }
    setSuccessfulResults([]);
    setFailedResults([]);
  }, []);

  const handleClearedJobSelection = useCallback(() => {
    viewedJobIdRef.current = null;
    setSuccessfulResults([]);
    setFailedResults([]);
  }, []);
  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    const initFetchJobs = async () => {
      await fetchJobs();
    };
    initFetchJobs();
  }, [fetchJobs]);

  // ── Reconnect SSE if a job is already running on page load ────────────────
  // Runs once when the initial fetchJobs completes (jobsLoading flips to false)
  useEffect(() => {
    if (jobsLoading) return;
    const runningJob = jobs.find((job) => job.isRunning);
    if (runningJob && !eventSourceRef.current) {
      openSSEStream(runningJob.id);
      // Also select the running job so viewedJobIdRef is set and the snapshot
      // loads — otherwise input_success/input_failed events are dropped because
      // viewedJobIdRef.current is null and results never appear on refresh.
      handleSelectJob(runningJob.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobsLoading]); // intentionally only fires when loading state changes

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
    (jobId: string) => {
      // Optimistically mark as running so the banner appears immediately,
      // without waiting for the SSE "started" event (which can be missed if
      // the runner emits it before the EventSource connects).
      setJobs((prev) => prev.map((job) => (job.id === jobId ? { ...job, isRunning: true } : job)));
      openSSEStream(jobId);
    },
    [openSSEStream],
  );

  // ── Stop handler — owned here so banner and panel share the same action ───
  async function handleStop() {
    const runningJob = jobs.find((job) => job.isRunning);
    if (!runningJob) return;
    setStopping(true);
    try {
      const res = await fetch(`/api/extraction-jobs/${runningJob.id}/stop`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to stop the extraction job.");
        return;
      }
      toast.success(data.message || "Stop requested.");
      // Optimistically clear running state so the banner disappears immediately.
      // If the SSE stream is dead, the "stopped" event will never arrive and
      // the banner would hang forever. fetchJobs() syncs final DB state.
      setJobs((prev) =>
        prev.map((job) =>
          job.id === runningJob.id ? { ...job, isRunning: false, currentInputLabel: null } : job,
        ),
      );
      window.setTimeout(() => {
        fetchJobs();
        if (viewedJobIdRef.current === runningJob.id) {
          fetchResultsSnapshot(runningJob.id);
        }
      }, 1_500);
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setStopping(false);
    }
  }

  const runningJob = jobs.find((job) => job.isRunning) ?? null;
  const hasRunningJob = runningJob !== null;

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="border-b border-border bg-surface-panel-header px-3 py-3 sm:px-6 sm:py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Logo className="size-7 fill-blue-500" />
            <span className="font-mono text-sm font-semibold tracking-widest uppercase">
              Parse Engine
            </span>
          </div>
        </div>

        {ollamaOnline !== null && (
          <div className="flex items-center gap-2">
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
          </div>
        )}
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
              setJobs={setJobs}
              hasRunningJob={hasRunningJob}
              jobsLoading={jobsLoading}
              successfulResults={successfulResults}
              failedResults={failedResults}
              onSelectJob={handleSelectJob}
              onStarted={handleStarted}
              onDeletedJob={handleDeletedJob}
              onClearedSelection={handleClearedJobSelection}
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
    </div>
  );
}
