"use client";

import { type KeyboardEvent, useState } from "react";
import {
  Check,
  Clock,
  Loader2,
  MoreHorizontal,
  Pencil,
  Play,
  Square,
  Trash2,
  X,
} from "lucide-react";

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
import { Input } from "@/components/shadcn_ui/input";
import type { ExtractionJob, JobStatus } from "@/components/features/extraction-jobs/types";
import { formatTime } from "@/components/features/extraction-jobs/utils";

import { ModelOptionsDisplay } from "./ModelOptionsDisplay";
import { StatusBadge } from "./StatusBadge";

function JobTitleEditor({
  title,
  updateLoading,
  onUpdateTitle,
}: {
  title: string;
  updateLoading: boolean;
  onUpdateTitle: (title: string) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  const trimmedDraft = draft.trim();
  const saveDisabled = updateLoading || trimmedDraft.length === 0 || trimmedDraft === title;

  function startEditing() {
    setDraft(title);
    setEditing(true);
  }

  function cancelEditing() {
    if (updateLoading) return;
    setDraft(title);
    setEditing(false);
  }

  async function saveTitle() {
    if (saveDisabled) {
      if (trimmedDraft === title) {
        setEditing(false);
      }
      return;
    }

    const updated = await onUpdateTitle(trimmedDraft);
    if (updated) {
      setDraft(trimmedDraft);
      setEditing(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      void saveTitle();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      cancelEditing();
    }
  }

  if (editing) {
    return (
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={updateLoading}
          autoFocus
          aria-label="Extraction job title"
          aria-invalid={trimmedDraft.length === 0}
          className="h-8 min-w-48 max-w-lg rounded-sm font-mono text-base font-semibold"
        />
        <Button
          type="button"
          size="icon-sm"
          variant="outline"
          onClick={() => {
            void saveTitle();
          }}
          disabled={saveDisabled}
          className="rounded-sm"
          aria-label="Save extraction job title"
        >
          {updateLoading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Check className="size-3.5" />
          )}
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          onClick={cancelEditing}
          disabled={updateLoading}
          className="rounded-sm text-muted-foreground hover:text-foreground"
          aria-label="Cancel title edit"
        >
          <X className="size-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <h2 className="font-mono text-base font-semibold text-foreground">{title}</h2>
      <Button
        type="button"
        size="icon-xs"
        variant="ghost"
        onClick={startEditing}
        disabled={updateLoading}
        className="rounded-sm text-muted-foreground hover:text-foreground"
        aria-label="Edit extraction job title"
      >
        <Pencil className="size-3" />
      </Button>
    </div>
  );
}

export function ExtractionJobHeader({
  job,
  status,
  selectedJobIsRunning,
  anotherJobIsRunning,
  hasAnyRunningJob,
  actionLoading,
  retryFailedLoading,
  stopping,
  deleteLoading,
  deleteDisabled,
  titleUpdateLoading,
  onStart,
  onStop,
  onDeleteJob,
  onUpdateTitle,
}: {
  job: ExtractionJob;
  status: JobStatus;
  selectedJobIsRunning: boolean;
  anotherJobIsRunning: boolean;
  hasAnyRunningJob: boolean;
  actionLoading: boolean;
  retryFailedLoading: boolean;
  stopping: boolean;
  deleteLoading: boolean;
  deleteDisabled: boolean;
  titleUpdateLoading: boolean;
  onStart: () => void;
  onStop: () => void;
  onDeleteJob: () => Promise<boolean>;
  onUpdateTitle: (title: string) => Promise<boolean>;
}) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  async function handleConfirmDelete() {
    const deleted = await onDeleteJob();
    if (deleted) {
      setDeleteDialogOpen(false);
    }
  }

  return (
    <div>
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
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <JobTitleEditor
              title={job.title}
              updateLoading={titleUpdateLoading}
              onUpdateTitle={onUpdateTitle}
            />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground font-mono mb-1">
            <span>
              Model: <span className="text-foreground">{job.modelName}</span>
            </span>
            <span>
              Instruction: <span className="text-foreground">{job.instruction.title}</span>
            </span>
            <span>
              Dataset: <span className="text-foreground">{job.dataset.name}</span>
            </span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground font-mono">
            <ModelOptionsDisplay options={job.modelOptions} />
          </div>
        </div>

        <div className="flex items-center gap-6 pr-3 shrink-0">
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
                  : "\u2014"}
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
                  Delete job
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
