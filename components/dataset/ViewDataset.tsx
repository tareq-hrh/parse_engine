import { useState } from "react";
import { ScrollArea } from "@/components/shadcn_ui/scroll-area";
import { Separator } from "@/components/shadcn_ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/shadcn_ui/tabs";
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
import { List, PlusCircle, PenLine, Upload, Code2, Loader2, MoreHorizontal, Trash2 } from "lucide-react";
import { Dataset } from "./types";
import { InputList } from "./InputList";
import { UploadInputsForm } from "./UploadInputsForm";
import { ManualInputForm } from "./ManualInputForm";

type InputMethod = "manual" | "upload" | "api";

export function ViewDataset({
  dataset,
  deleteLoading,
  onDeleteDataset,
  onInputsChanged,
}: {
  dataset: Dataset;
  deleteLoading: boolean;
  onDeleteDataset: () => Promise<boolean>;
  onInputsChanged: () => void;
}) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [inputMethod, setInputMethod] = useState<InputMethod>("manual");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  function handleInputsAdded() {
    setRefreshKey((k) => k + 1);
    onInputsChanged();
  }

  async function handleConfirmDelete() {
    const deleted = await onDeleteDataset();
    if (deleted) {
      setDeleteDialogOpen(false);
    }
  }

  return (
    <ScrollArea className="flex-1">
      <div className="px-3 py-5 space-y-5">
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <h2 className="font-mono text-base font-semibold text-foreground wrap-break-word">
                {dataset.name}
              </h2>
              <span className="font-mono text-xs text-muted-foreground">
                {dataset.inputCount} {dataset.inputCount === 1 ? "input" : "inputs"}
              </span>
            </div>
            {dataset.description && (
              <p className="font-mono text-xs text-muted-foreground mt-1 wrap-break-word">
                {dataset.description}
              </p>
            )}
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
                  aria-label="Open dataset actions"
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
                  disabled={deleteLoading}
                  onSelect={(event) => {
                    event.preventDefault();
                    setDeleteDialogOpen(true);
                  }}
                  className="font-mono text-xs"
                >
                  <Trash2 className="size-3.5" />
                  Delete dataset
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DialogContent className="font-mono">
              <DialogHeader>
                <DialogTitle>Delete dataset?</DialogTitle>
                <DialogDescription>
                  This deletes the dataset and all of its inputs. Datasets used by extraction jobs
                  must have those jobs deleted first.
                </DialogDescription>
              </DialogHeader>
              <div className="rounded-sm border border-border bg-muted/30 p-3 text-xs">
                <div className="text-muted-foreground uppercase tracking-wider">Dataset</div>
                <div className="mt-1 text-foreground wrap-break-word">{dataset.name}</div>
                <div className="mt-3 text-muted-foreground">
                  Inputs to remove: {dataset.inputCount}
                </div>
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
                  Delete dataset
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Separator />

        {/* ── Tabs ────────────────────────────────────────────────────── */}
        <Tabs defaultValue="inputs">
          <TabsList className="w-full">
            <TabsTrigger value="inputs" className="flex-1 font-mono text-xs gap-1.5">
              <List className="w-3.5 h-3.5" />
              Inputs ({dataset.inputCount})
            </TabsTrigger>
            <TabsTrigger value="add" className="flex-1 font-mono text-xs gap-1.5">
              <PlusCircle className="w-3.5 h-3.5" />
              Add Inputs
            </TabsTrigger>
          </TabsList>

          {/* ── Inputs tab ──────────────────────────────────────────── */}
          <TabsContent value="inputs" className="mt-3">
            <InputList
              key={`${dataset.slug}-${refreshKey}`}
              datasetSlug={dataset.slug}
              onInputsChanged={onInputsChanged}
            />
          </TabsContent>

          {/* ── Add tab ─────────────────────────────────────────────── */}
          <TabsContent value="add" className="mt-3 space-y-3">
            {/* Method selector */}
            <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
              SELECT INPUT METHOD
            </p>
            <div className="flex gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInputMethod("manual")}
                className={`rounded-sm flex-1 font-mono text-xs gap-1.5 hover:text-blue-400 hover:bg-blue-400/10 ${
                  inputMethod === "manual"
                    ? "bg-blue-400/10 text-blue-400 border-blue-400"
                    : "text-muted-foreground"
                }`}
              >
                <PenLine className="size-4" />
                Manual
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInputMethod("upload")}
                className={`rounded-sm flex-1 font-mono text-xs gap-1.5 hover:text-blue-400 hover:bg-blue-400/10 ${
                  inputMethod === "upload"
                    ? "bg-blue-400/10 text-blue-400 border-blue-400"
                    : "text-muted-foreground"
                }`}
              >
                <Upload className="size-4" />
                Upload
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInputMethod("api")}
                className={`rounded-sm flex-1 font-mono text-xs gap-1.5 hover:text-blue-400 hover:bg-blue-400/10 ${
                  inputMethod === "api"
                    ? "bg-blue-400/10 text-blue-400 border-blue-400"
                    : "text-muted-foreground"
                }`}
              >
                <Code2 className="size-4" />
                API
              </Button>
            </div>

            <Separator />

            {/* Method content */}
            {inputMethod === "manual" && (
              <ManualInputForm datasetId={dataset.id} onAdded={handleInputsAdded} />
            )}

            {inputMethod === "upload" && (
              <UploadInputsForm datasetId={dataset.id} onUploaded={handleInputsAdded} />
            )}

            {inputMethod === "api" && (
              <div className="space-y-1.5">
                <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
                  Programmatic API Endpoint
                </p>
                <code className="block font-mono text-xs text-foreground bg-muted/40 border border-border rounded-sm px-3 py-2 break-all">
                  POST /api/datasets/{dataset.slug}/inputs
                </code>
                <p className="font-mono text-[10px] text-muted-foreground">
                  Body:{" "}
                  <span className="text-foreground">
                    {`{ "inputs": [{ "label": "...", "content": "..." }] }`}
                  </span>
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </ScrollArea>
  );
}
