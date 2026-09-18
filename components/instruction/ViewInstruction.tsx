"use client";

import { useState } from "react";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/shadcn_ui/dropdown-menu";
import { ScrollArea } from "@/components/shadcn_ui/scroll-area";
import { Loader2, MoreHorizontal, PenLine, Trash2 } from "lucide-react";
import { schemaToSimplePreview } from "./SchemaBuilder";
import { Instruction } from "./types";

interface ViewInstructionProps {
  instruction: Instruction;
  onEditInstruction: () => void;
  deleteLoading: boolean;
  onDeleteInstruction: () => Promise<boolean>;
}

export function ViewInstruction({
  instruction,
  onEditInstruction,
  deleteLoading,
  onDeleteInstruction,
}: ViewInstructionProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  async function handleConfirmDelete() {
    const deleted = await onDeleteInstruction();
    if (deleted) {
      setDeleteDialogOpen(false);
    }
  }

  return (
    <>
      <div className="px-3 py-5 border-b border-border shrink-0 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-mono text-base font-semibold text-foreground wrap-break-word">
            {instruction.title}
          </h2>
          <p className="text-xs text-muted-foreground font-mono mt-1">
            Created:{" "}
            {new Date(instruction.createdAt).toLocaleString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
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
                className="rounded-sm text-muted-foreground hover:text-foreground shrink-0"
                aria-label="Open instruction actions"
              >
                {deleteLoading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <MoreHorizontal className="size-3.5" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                disabled={deleteLoading}
                onSelect={onEditInstruction}
                className="font-mono text-xs"
              >
                <PenLine className="size-3.5" />
                Edit instruction
              </DropdownMenuItem>
              <DropdownMenuSeparator />
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
                Delete instruction
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DialogContent className="font-mono">
            <DialogHeader>
              <DialogTitle>Delete instruction?</DialogTitle>
              <DialogDescription>
                This deletes the instruction only. Instructions used by extraction jobs must have
                those jobs deleted first.
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-sm border border-border bg-muted/30 p-3 text-xs">
              <div className="text-muted-foreground uppercase tracking-wider">Instruction</div>
              <div className="mt-1 text-foreground wrap-break-word">{instruction.title}</div>
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
                Delete instruction
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <ScrollArea className="flex-1 p-5">
        <div className="space-y-5">
          {/* Prompt template */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                PROMPT TEMPLATE
              </span>
            </div>
            <pre className="h-150 overflow-auto font-mono text-xs text-foreground whitespace-pre-wrap leading-relaxed bg-muted/30 rounded-sm p-3 border border-border">
              {instruction.prompt}
            </pre>
            <p className="text-[10px] text-muted-foreground/60 font-mono">
              <code className="text-blue-400">{"{INPUT_TEXT}"}</code> specifies where the input content
              should be inserted. If omitted, the input is appended to the end of the prompt automatically.
            </p>
          </div>

          {/* Output Schema */}
          {instruction.outputSchema && (
            <div className="flex-1 rounded-md border border-border overflow-hidden flex flex-col">
              {/* Title bar */}
              <div className="bg-muted/60 border-b border-border px-3 py-2 flex items-center gap-2 shrink-0">
                <span className="size-2.5 rounded-full bg-red-400/70" />
                <span className="size-2.5 rounded-full bg-yellow-400/70" />
                <span className="size-2.5 rounded-full bg-green-400/70" />
                <span className="ml-2 font-mono text-[10px] text-muted-foreground/50 uppercase tracking-wider">
                  Output Schema
                </span>
              </div>
              {/* Code body */}
              <pre className="bg-preview-window flex-1 font-mono text-[11px] p-3 text-muted-foreground overflow-auto whitespace-pre leading-relaxed">
                {JSON.stringify(schemaToSimplePreview(instruction.outputSchema!), null, 2)}
              </pre>
            </div>
          )}
        </div>
      </ScrollArea>
    </>
  );
}
