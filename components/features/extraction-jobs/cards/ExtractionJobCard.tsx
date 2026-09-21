import { Cpu, ChevronRight } from "lucide-react";
import { ExtractionJob } from "@/components/features/extraction-jobs/types";
import { getJobStatus } from "@/components/features/extraction-jobs/utils";
import { StatusBadge } from "@/components/features/extraction-jobs/detail/StatusBadge";

export function ExtractionJobCard({
  job,
  isSelected,
  onClick,
}: {
  job: ExtractionJob;
  isSelected: boolean;
  onClick: () => void;
}) {
  const instructionTitle = job.instruction.title;
  const status = getJobStatus(job);
  const createdAt = new Date(job.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const total = job.totalInputCount;
  const successPercent =
    total > 0 ? Math.min(100, Math.round((job.successfulResultCount / total) * 100)) : 0;
  const failurePercent = total > 0 ? Math.min(100, Math.round((job.failedResultCount / total) * 100)) : 0;

  return (
    <button
      type="button"
      onClick={isSelected ? undefined : onClick}
      aria-current={isSelected ? "true" : undefined}
      aria-label={`Open extraction job ${job.title}`}
      className={`w-full text-left p-2 border rounded-sm transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
        isSelected
          ? "border-blue-500/40 bg-blue-500/5"
          : "border-border bg-card hover:border-blue-500/30"
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Cpu className="size-4 text-muted-foreground shrink-0 mt-0.5" />
          <span className="font-mono text-sm text-foreground line-clamp-2 leading-tight">
            {job.title}
          </span>
        </div>
        {isSelected && <ChevronRight className="size-4 text-blue-400 shrink-0 mt-0.5" />}
      </div>
      <div className="pl-5 space-y-1.5">
        <div className="text-[11px] text-muted-foreground font-mono flex gap-2 items-center">
          <StatusBadge status={status} />
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">{successPercent + failurePercent}%</span>
            <span className="text-muted-foreground">
              ({job.failedResultCount + job.successfulResultCount}/{total})
            </span>
          </div>
        </div>

        <div className="text-[11px] text-muted-foreground font-mono space-y-0.5 mt-1">
          <div>
            Model: <span className="text-foreground">{job.modelName}</span>
          </div>
          <div>
            Instruction: <span className="text-foreground">{instructionTitle}</span>
          </div>
          <div>
            Created: <span className="text-foreground">{createdAt}</span>
          </div>
        </div>
      </div>
    </button>
  );
}
