import { FileText, ChevronRight } from "lucide-react";
import { Instruction } from "./types";

export function InstructionCard({
  instruction,
  isSelected,
  onClick,
}: {
  instruction: Instruction;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={isSelected ? "true" : undefined}
      aria-label={`Open instruction ${instruction.title}`}
      className={`w-full text-left p-2 border rounded-sm transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
        isSelected
          ? "border-blue-500/40 bg-blue-500/5"
          : "border-border bg-card hover:border-blue-500/30"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="size-3 text-muted-foreground shrink-0" />
          <span className="max-w-50 font-mono text-sm text-foreground truncate">{instruction.title}</span>
        </div>
        {isSelected && <ChevronRight className="size-4 text-blue-400 shrink-0" />}
      </div>
      <p className="text-[10px] text-muted-foreground/50 font-mono mt-1.5 pl-5">
        {new Date(instruction.createdAt).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })}
      </p>
    </button>
  );
}
