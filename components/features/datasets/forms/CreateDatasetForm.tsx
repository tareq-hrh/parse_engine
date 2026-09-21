"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, X } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "react-toastify";

import { Button } from "@/components/shadcn_ui/button";
import { Input } from "@/components/shadcn_ui/input";
import { Label } from "@/components/shadcn_ui/label";
import { ScrollArea } from "@/components/shadcn_ui/scroll-area";
import { Textarea } from "@/components/shadcn_ui/textarea";
import { generateDatasetSlug } from "@/lib/datasetSlug";
import { datasetFormSchema, type DatasetFormValues } from "@/components/features/datasets/schemas/datasetFormSchema";
import { Dataset } from "@/components/features/datasets/types";
import {
  getDatasetMutationErrorMessage,
  useCreateDatasetMutation,
} from "@/components/features/datasets/hooks/useDatasetMutations";

export function CreateDatasetForm({
  onCreated,
  onCancel,
}: {
  onCreated: (dataset: Dataset) => void;
  onCancel: () => void;
}) {
  const createDatasetMutation = useCreateDatasetMutation();
  const loading = createDatasetMutation.isPending;
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<DatasetFormValues>({
    resolver: zodResolver(datasetFormSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const name = useWatch({ control, name: "name" });
  const slugPreview = generateDatasetSlug(name);

  async function handleCreate(values: DatasetFormValues) {
    try {
      const data = await createDatasetMutation.mutateAsync({
        name: values.name,
        description: values.description || undefined,
      });

      toast.success("Dataset created successfully.");
      onCreated(data);
    } catch (error) {
      toast.error(getDatasetMutationErrorMessage(error, "Failed to create dataset."));
    }
  }

  return (
    <form
      id="create-dataset-form"
      onSubmit={handleSubmit(handleCreate)}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="flex shrink-0 flex-col gap-3 border-b border-border bg-surface-panel-header p-5 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-mono text-base font-semibold text-foreground">New Dataset</h2>
        <div className="flex gap-2 sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="flex-1 font-mono text-xs gap-1.5 text-muted-foreground sm:flex-none"
          >
            <X className="size-3.5" />
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={loading}
            className="flex-1 font-mono text-xs gap-1.5 bg-blue-600 hover:bg-blue-500 text-white sm:flex-none"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {loading ? "Creating..." : "Create"}
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-5 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="dataset-name" className="font-mono text-xs uppercase tracking-wider">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="dataset-name"
              {...register("name")}
              placeholder="e.g. Invoices 2025"
              aria-invalid={errors.name ? "true" : undefined}
              className="font-mono text-sm"
            />
            {errors.name ? (
              <p className="font-mono text-xs text-destructive">{errors.name.message}</p>
            ) : (
              name.trim() && (
                <p className="font-mono text-[11px] text-muted-foreground">
                  Slug will be:{" "}
                  <span className="text-foreground">{slugPreview || "invalid-name"}</span>
                </p>
              )
            )}
          </div>

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
              {...register("description")}
              placeholder="e.g. Invoices from 2025"
              className="font-mono text-xs h-24"
            />
          </div>
        </div>
      </ScrollArea>
    </form>
  );
}
