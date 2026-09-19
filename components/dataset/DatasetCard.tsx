import { Database, ChevronRight } from "lucide-react";
import { Dataset } from "./types";

export function DatasetCard({
  dataset,
  isSelected,
  onClick,
}: {
  dataset: Dataset;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={isSelected ? "true" : undefined}
      aria-label={`Open dataset ${dataset.name}`}
      className={`w-full text-left p-3 border rounded-sm transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
        isSelected
          ? "border-blue-500/40 bg-blue-500/5"
          : "border-border bg-card hover:border-blue-500/30"
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <Database className="size-4 text-muted-foreground shrink-0 mt-0.5" />
          <span className="font-mono text-sm text-foreground line-clamp-2 leading-tight">
            {dataset.name}
          </span>
        </div>
        {isSelected && <ChevronRight className="size-4 text-blue-400 shrink-0 mt-0.5" />}
      </div>
      <div className="pl-5 space-y-0.5">
        <p className="font-mono text-[11px] text-muted-foreground">
          {dataset.inputCount} {dataset.inputCount === 1 ? "input" : "inputs"}
        </p>
      </div>
    </button>
  );
}
