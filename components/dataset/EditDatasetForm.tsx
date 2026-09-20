"use client";

import { useState } from "react";
import { toast } from "react-toastify";
import { Button } from "@/components/shadcn_ui/button";
import { Input } from "@/components/shadcn_ui/input";
import { Label } from "@/components/shadcn_ui/label";
import { ScrollArea } from "@/components/shadcn_ui/scroll-area";
import { Textarea } from "@/components/shadcn_ui/textarea";
import { Loader2, Save, X } from "lucide-react";
import { Dataset } from "./types";
import {
  getDatasetMutationErrorMessage,
  useUpdateDatasetMutation,
} from "./useDatasetMutations";

export function EditDatasetForm({
  dataset,
  onUpdated,
  onCancel,
}: {
  dataset: Dataset;
  onUpdated: (dataset: Dataset) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(dataset.name);
  const [description, setDescription] = useState(dataset.description ?? "");
  const updateDatasetMutation = useUpdateDatasetMutation();
  const loading = updateDatasetMutation.isPending;

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Dataset name is required.");
      return;
    }

    try {
      const data = await updateDatasetMutation.mutateAsync({
        slug: dataset.slug,
        name: name.trim(),
        description: description.trim() || null,
      });

      toast.success("Dataset updated.");
      onUpdated(data);
    } catch (error) {
      toast.error(getDatasetMutationErrorMessage(error, "Failed to update dataset."));
    }
  }

  return (
    <>
      <div className="flex shrink-0 flex-col gap-3 border-b border-border bg-surface-panel-header p-5 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-mono text-base font-semibold text-foreground">Edit Dataset</h2>
        <div className="flex gap-2 sm:justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 font-mono text-xs gap-1.5 text-muted-foreground sm:flex-none"
          >
            <X className="size-3.5" />
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={loading}
            className="flex-1 font-mono text-xs gap-1.5 bg-blue-600 hover:bg-blue-500 text-white sm:flex-none"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {loading ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-5 space-y-5">
          <div className="space-y-2">
            <Label
              htmlFor="edit-dataset-name"
              className="font-mono text-xs uppercase tracking-wider"
            >
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-dataset-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Invoices 2025"
              className="font-mono text-sm"
            />
            <p className="font-mono text-[11px] text-muted-foreground">
              API slug stays: <span className="text-foreground">{dataset.slug}</span>
            </p>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="edit-dataset-description"
              className="font-mono text-xs uppercase tracking-wider"
            >
              Description{" "}
              <span className="text-muted-foreground normal-case tracking-normal">(optional)</span>
            </Label>
            <Textarea
              id="edit-dataset-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="e.g. Invoices from 2025"
              className="font-mono text-xs h-24"
            />
          </div>

        </div>
      </ScrollArea>
    </>
  );
}
