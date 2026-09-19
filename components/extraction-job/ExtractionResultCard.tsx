"use client";

import { useState } from "react";
import { Separator } from "@/components/shadcn_ui/separator";
import { Button } from "@/components/shadcn_ui/button";
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
import { Clock, Loader2, MoreHorizontal, Trash2 } from "lucide-react";
import {
  fetchDatasetInputContent,
  getDatasetInputContentErrorMessage,
} from "@/lib/datasetInputContentClient";
import { ExtractionResult, Primitive, FlatObject } from "./types";
import { formatTime } from "./utils";
import { ScrollArea } from "../shadcn_ui/scroll-area";
import { UsageMetricsDisclosure } from "./UsageMetricsDisclosure";

// ── Type guards ────────────────────────────────────────────────────────────────

function isFlatObjectArray(val: unknown): val is FlatObject[] {
  return (
    Array.isArray(val) &&
    val.length > 0 &&
    typeof val[0] === "object" &&
    val[0] !== null &&
    !Array.isArray(val[0])
  );
}

function isPrimitiveArray(val: unknown): val is Primitive[] {
  return Array.isArray(val) && (val.length === 0 || typeof val[0] !== "object");
}

function isFlatObject(val: unknown): val is FlatObject {
  return typeof val === "object" && val !== null && !Array.isArray(val);
}

function formatPrimitive(val: Primitive): string {
  if (val === null) return "—";
  if (typeof val === "boolean") return val ? "true" : "false";
  return String(val);
}

// ── Sub-renderers ──────────────────────────────────────────────────────────────

function isURL(val: string): boolean {
  try {
    const u = new URL(val);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function PrimitiveValue({ value }: { value: Primitive }) {
  if (typeof value === "object" && value !== null)
    return <span className="font-mono text-xs text-foreground break-all">{JSON.stringify(value)}</span>;
  if (value === null)
    return <span className="font-mono text-xs text-muted-foreground/50 italic">null</span>;
  if (typeof value === "boolean")
    return (
      <span className={`font-mono text-xs ${value ? "text-green-400" : "text-red-400"}`}>
        {String(value)}
      </span>
    );
  if (typeof value === "number")
    return <span className="font-mono text-xs text-amber-400">{value}</span>;
  if (typeof value === "string" && isURL(value)) {
    const hostname = new URL(value).hostname.replace(/^www\./, "");
    return (
      <a
        href={value}
        target="_blank"
        rel="noopener noreferrer"
        title={value}
        className="font-mono text-xs text-blue-400 hover:text-blue-300 underline underline-offset-2"
      >
        {hostname} ↗
      </a>
    );
  }
  return <span className="font-mono text-xs text-foreground break-all">{value}</span>;
}

function PrimitiveChip({ value }: { value: Primitive }) {
  return (
    <span className="bg-blue-300/10 text-blue-500 border border-blue-500/40 font-mono text-[10px] px-1.5 py-0.5 rounded">
      {formatPrimitive(value)}
    </span>
  );
}

function FlatObjectTable({ rows }: { rows: FlatObject[] }) {
  if (rows.length === 0) return null;
  // Derive columns from the union of all row keys (preserving first-row order)
  const colSet = new Set<string>();
  rows.forEach((row) => Object.keys(row).forEach((k) => colSet.add(k)));
  const columns = Array.from(colSet);

  return (
    <ScrollArea className="max-h-48 overflow-x-auto rounded-sm border border-border">
      <table className="w-full text-[10px] font-mono border-collapse relative">
        <thead className="sticky top-0">
          <tr className="bg-muted">
            {columns.map((col) => (
              <th
                key={col}
                className="px-2 py-1 text-left text-muted-foreground uppercase tracking-wider font-medium border-b border-border whitespace-nowrap"
              >
                {col.replace(/_/g, " ")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIdx) => (
            <tr key={rowIdx} className={rowIdx % 2 === 0 ? "bg-background" : "bg-muted/20"}>
              {columns.map((col) => {
                const cell = row[col] ?? null;
                return (
                  <td key={col} className="px-2 py-1 border-b border-border/50 align-center">
                    {Array.isArray(cell) ? (
                      <div className="flex flex-wrap gap-0.5">
                        {(cell as Primitive[]).map((v, i) => (
                          <PrimitiveChip key={i} value={v} />
                        ))}
                      </div>
                    ) : (
                      <PrimitiveValue value={cell as Primitive} />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollArea>
  );
}

// ── Main ExtractionResultCard ────────────────────────────────────────────────────────

export function ExtractionResultCard({
  result,
  deleteDisabled,
  onDeleteResult,
}: {
  result: ExtractionResult;
  deleteDisabled: boolean;
  onDeleteResult: (resultId: string) => Promise<boolean>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [content, setContent] = useState<string | null>(null);
  const [contentError, setContentError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const contentId = `result-input-content-${result.id}`;

  async function handleToggle() {
    if (expanded) {
      setExpanded(false);
      return;
    }

    if (content === null) {
      setLoading(true);
      setContentError(null);
      try {
        setContent(await fetchDatasetInputContent(result.datasetInputId));
      } catch (error) {
        setContentError(getDatasetInputContentErrorMessage(error));
      } finally {
        setLoading(false);
      }
    }

    setExpanded(true);
  }

  async function handleConfirmDelete() {
    setDeleteLoading(true);
    try {
      const deleted = await onDeleteResult(result.id);
      if (deleted) {
        setDeleteDialogOpen(false);
      }
    } finally {
      setDeleteLoading(false);
    }
  }

  const d = result.extractedData!;
  const entries = Object.entries(d).filter(([, val]) => {
    if (val === null || val === undefined || val === "") return false;
    if (Array.isArray(val) && val.length === 0) return false;
    return true;
  });

  return (
    <div className="border border-border bg-surface-raised rounded-lg p-3 space-y-2">
      {/* ── Header row: timestamp ───────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-xs text-muted-foreground/80 shrink-0">
          {new Date(result.createdAt).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
        <Dialog
          open={deleteDialogOpen}
          onOpenChange={(open) => {
            if (!deleteLoading) setDeleteDialogOpen(open);
          }}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon-xs"
                variant="ghost"
                disabled={deleteLoading}
                className="rounded-sm text-muted-foreground hover:text-foreground"
                aria-label={`Open actions for result ${result.inputLabel}`}
              >
                {deleteLoading ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <MoreHorizontal className="size-3" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem
                variant="destructive"
                disabled={deleteDisabled || deleteLoading}
                onSelect={(event) => {
                  event.preventDefault();
                  setDeleteDialogOpen(true);
                }}
                className="font-mono text-xs"
              >
                <Trash2 className="size-3.5" />
                Delete result
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DialogContent className="font-mono">
            <DialogHeader>
              <DialogTitle>Delete extraction result?</DialogTitle>
              <DialogDescription>
                This deletes only this result. The dataset input stays available and can be
                processed again when this job starts.
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-sm border border-border bg-muted/30 p-3 text-xs">
              <div className="text-muted-foreground uppercase tracking-wider">Input</div>
              <div className="mt-1 text-foreground wrap-break-word">{result.inputLabel}</div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" disabled={deleteLoading} className="font-mono text-xs">
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
                Delete result
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Separator />

      {/* ── Extracted data fields ───────────────────────────────────────── */}
      <div className="space-y-2.5">
        {entries.map(([key, val]) => {
          const label = (
            <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider shrink-0">
              {key.replace(/_/g, " ")}:
            </span>
          );

          // FlatObject[] → inline table
          if (isFlatObjectArray(val)) {
            return (
              <div key={key} className="space-y-1">
                {label}
                <FlatObjectTable rows={val as FlatObject[]} />
              </div>
            );
          }

          // Primitive[] → chip list
          if (isPrimitiveArray(val)) {
            return (
              <div key={key} className="flex items-baseline gap-2 flex-wrap min-w-0">
                {label}
                <div className="flex flex-wrap gap-1">
                  {(val as Primitive[])
                    .filter((item) => item !== null && item !== undefined && item !== "")
                    .map((item, idx) => (
                      <PrimitiveChip key={`${key}-${idx}`} value={item} />
                    ))}
                </div>
              </div>
            );
          }

          // Single FlatObject → one-row table
          if (isFlatObject(val)) {
            return (
              <div key={key} className="space-y-1">
                {label}
                <FlatObjectTable rows={[val as FlatObject]} />
              </div>
            );
          }

          // Primitive scalar → key: value
          return (
            <div key={key} className="flex items-baseline gap-1.5 min-w-0">
              {label}
              <PrimitiveValue value={val as Primitive} />
            </div>
          );
        })}
      </div>

      {/* ── Result metadata + processing time + input content toggle ────────── */}
      <Separator />
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-[10px] text-blue-400/70 shrink-0 flex items-center gap-0.5">
            <Clock className="size-2.5" />
            {formatTime(result.processingDurationSeconds)}
          </span>
          <span className="font-mono text-[10px] text-muted-foreground/60">·</span>
          <span className="font-mono text-[10px] text-muted-foreground/60 truncate">
            {result.inputLabel}
          </span>
        </div>

        <button
          type="button"
          onClick={handleToggle}
          aria-expanded={expanded}
          aria-controls={contentId}
          className="font-mono text-[10px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-sm"
        >
          {loading ? (
            <span className="flex items-center gap-1">
              <Loader2 className="size-3 animate-spin" />
              Loading...
            </span>
          ) : expanded ? (
            "Hide input content"
          ) : (
            "Show input content"
          )}
        </button>
      </div>

      <UsageMetricsDisclosure metrics={result.usageMetrics} />

      {/* ── Raw content window ───────────────────────────────────────────── */}
      {expanded && content !== null && (
        <ScrollArea id={contentId} className="h-48 rounded-sm border border-border bg-muted/30">
          <pre className="font-mono text-[10px] text-foreground p-2 whitespace-pre-wrap break-all">
            {content}
          </pre>
        </ScrollArea>
      )}

      {expanded && contentError && (
        <div className="rounded-sm border border-destructive/30 bg-destructive/10 p-2 font-mono text-[10px] text-destructive">
          {contentError}
        </div>
      )}
    </div>
  );
}
