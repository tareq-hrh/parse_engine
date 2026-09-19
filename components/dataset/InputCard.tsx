"use client";

import { useState } from "react";
import { toast } from "react-toastify";
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
import { Loader2, MoreHorizontal, Trash2 } from "lucide-react";
import {
  fetchDatasetInputContent,
  getDatasetInputContentErrorMessage,
} from "@/lib/datasetInputContentClient";
import { DatasetInput } from "./types";
import { ScrollArea } from "../shadcn_ui/scroll-area";

export function InputCard({
  input,
  onDeleted,
}: {
  input: DatasetInput;
  onDeleted: (inputId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [content, setContent] = useState<string | null>(null);
  const [contentError, setContentError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const contentId = `dataset-input-content-${input.id}`;

  async function handleToggle() {
    if (expanded) {
      setExpanded(false);
      return;
    }

    // Fetch content on first expand
    if (content === null) {
      setLoading(true);
      setContentError(null);
      try {
        setContent(await fetchDatasetInputContent(input.id));
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
      const res = await fetch(`/api/dataset-inputs/${input.id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to delete dataset input.");
        return;
      }

      toast.success(data.message || "Dataset input deleted.");
      setDeleteDialogOpen(false);
      onDeleted(input.id);
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="border border-border rounded-sm bg-surface-raised p-2.5 space-y-2">
      {/* ── Header row ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-xs text-foreground truncate flex-1">{input.label}</span>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="font-mono text-[10px] text-muted-foreground/60">
            {new Date(input.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
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
                  aria-label="Open input actions"
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
                  disabled={deleteLoading}
                  onSelect={(event) => {
                    event.preventDefault();
                    setDeleteDialogOpen(true);
                  }}
                  className="font-mono text-xs"
                >
                  <Trash2 className="size-3.5" />
                  Delete input
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DialogContent className="font-mono">
              <DialogHeader>
                <DialogTitle>Delete dataset input?</DialogTitle>
                <DialogDescription>
                  This removes the input from the dataset. Inputs already used by extraction results
                  must have their related extraction jobs deleted first.
                </DialogDescription>
              </DialogHeader>
              <div className="rounded-sm border border-border bg-muted/30 p-3 text-xs">
                <div className="text-muted-foreground uppercase tracking-wider">Input</div>
                <div className="mt-1 text-foreground wrap-break-word">{input.label}</div>
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
                  Delete input
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ── Toggle button ───────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={expanded}
        aria-controls={contentId}
        className="font-mono text-[10px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-sm"
      >
        {loading ? (
          <span className="flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            Loading...
          </span>
        ) : expanded ? (
          "Hide content"
        ) : (
          "Show content"
        )}
      </button>

      {/* ── Content window ──────────────────────────────────────────────── */}
      {expanded && content !== null && (
        <ScrollArea
          id={contentId}
          className="h-48 overflow-y-auto font-mono text-[10px] text-foreground bg-muted/30 border border-border rounded-sm p-2 whitespace-pre-wrap break-all"
        >
          {content}
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
