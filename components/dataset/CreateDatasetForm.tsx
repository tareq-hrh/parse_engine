"use client";

import { useState } from "react";
import { toast } from "react-toastify";
import { Button } from "@/components/shadcn_ui/button";
import { Input } from "@/components/shadcn_ui/input";
import { Label } from "@/components/shadcn_ui/label";
import { Textarea } from "@/components/shadcn_ui/textarea";
import { ScrollArea } from "@/components/shadcn_ui/scroll-area";
import { Plus, Loader2, X } from "lucide-react";
import { generateDatasetSlug } from "@/lib/datasetSlug";
import { Dataset } from "./types";

export function CreateDatasetForm({
  onCreated,
  onCancel,
}: {
  onCreated: (dataset: Dataset) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const slugPreview = generateDatasetSlug(name);

  async function handleCreate() {
    if (!name.trim()) {
      toast.error("Dataset name is required.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/datasets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to create dataset.");
        return;
      }

      toast.success("Dataset created successfully.");
      onCreated(data);
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Header */}
      <div className="flex shrink-0 flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-mono text-base font-semibold text-foreground">New Dataset</h2>
        <div className="flex gap-2 sm:justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="flex-1 font-mono text-xs gap-1.5 text-muted-foreground sm:flex-none"
          >
            <X className="size-3.5" />
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleCreate}
            disabled={loading}
            className="flex-1 font-mono text-xs gap-1.5 bg-blue-600 hover:bg-blue-500 text-white sm:flex-none"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {loading ? "Creating..." : "Create"}
          </Button>
        </div>
      </div>

      {/* Form */}
      <ScrollArea className="flex-1">
        <div className="p-5 space-y-5">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="dataset-name" className="font-mono text-xs uppercase tracking-wider">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="dataset-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Invoices 2025"
              className="font-mono text-sm"
            />
            {name.trim() && (
              <p className="font-mono text-[11px] text-muted-foreground">
                Slug will be:{" "}
                <span className="text-foreground">{slugPreview || "invalid-name"}</span>
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label
              htmlFor="dataset-description"
              className="font-mono text-xs uppercase tracking-wider"
            >
              Description{" "}
              <span className="text-muted-foreground normal-case tracking-normal">(optional)</span>
            </Label>
            <Textarea
              id="dataset-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Invoices from 2025"
              className="font-mono text-xs h-24"
            />
          </div>

        </div>
      </ScrollArea>
    </>
  );
}
