import { Cpu } from "lucide-react";

import type { ExtractionJob, JobStatus } from "@/components/features/extraction-jobs/types";

export function ExtractionJobProgress({
  job,
  status,
}: {
  job: ExtractionJob;
  status: JobStatus;
}) {
  const total = job.totalInputCount;
  const successPercent =
    total > 0 ? Math.min(100, Math.round((job.successfulResultCount / total) * 100)) : 0;
  const failurePercent =
    total > 0 ? Math.min(100, Math.round((job.failedResultCount / total) * 100)) : 0;

  return (
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
  );
}
