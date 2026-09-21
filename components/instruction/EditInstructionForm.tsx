"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save, X } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "react-toastify";

import { Button } from "@/components/shadcn_ui/button";
import { Input } from "@/components/shadcn_ui/input";
import { Label } from "@/components/shadcn_ui/label";
import { ScrollArea } from "@/components/shadcn_ui/scroll-area";
import { Textarea } from "@/components/shadcn_ui/textarea";
import { Instruction } from "./types";
import { SchemaBuilder, buildOutputSchema, schemaToSchemaFields } from "./SchemaBuilder";
import { instructionFormSchema, type InstructionFormValues } from "./instructionFormSchema";
import {
  getInstructionMutationErrorMessage,
  useUpdateInstructionMutation,
} from "./useInstructionMutations";

export function EditInstructionForm({
  instruction,
  onUpdated,
  onCancel,
}: {
  instruction: Instruction;
  onUpdated: (updatedInstruction: Instruction) => void;
  onCancel: () => void;
}) {
  const updateInstructionMutation = useUpdateInstructionMutation();
  const loading = updateInstructionMutation.isPending;
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<InstructionFormValues>({
    resolver: zodResolver(instructionFormSchema),
    defaultValues: {
      title: instruction.title,
      prompt: instruction.prompt,
      schemaFields: schemaToSchemaFields(instruction.outputSchema),
    },
  });

  async function handleSave(values: InstructionFormValues) {
    const parsedSchema = buildOutputSchema(values.schemaFields);

    try {
      const data = await updateInstructionMutation.mutateAsync({
        instructionId: instruction.id,
        title: values.title,
        prompt: values.prompt,
        outputSchema: parsedSchema,
      });

      toast.success("Instruction updated.");
      onUpdated(data);
    } catch (error) {
      toast.error(getInstructionMutationErrorMessage(error, "Failed to update instruction."));
    }
  }

  return (
    <form
      id="edit-instruction-form"
      onSubmit={handleSubmit(handleSave)}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="flex shrink-0 flex-col gap-3 border-b border-border bg-surface-panel-header p-5 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-mono text-base font-semibold text-foreground">Edit Instruction</h2>
        <div className="flex gap-2 sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 font-mono text-xs gap-1.5 text-muted-foreground sm:flex-none"
          >
            <X className="w-3.5 h-3.5" />
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
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
              htmlFor="edit-instruction-title"
              className="font-mono text-xs uppercase tracking-wider"
            >
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-instruction-title"
              {...register("title")}
              placeholder="e.g. Invoice Extraction v1"
              aria-invalid={errors.title ? "true" : undefined}
              className="font-mono text-sm"
            />
            {errors.title && (
              <p className="font-mono text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="edit-instruction-prompt"
              className="font-mono text-xs uppercase tracking-wider"
            >
              Prompt Template <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="edit-instruction-prompt"
              {...register("prompt")}
              placeholder="You are an information extraction engine. Extract structured data from the following input:&#10;&#10;{INPUT_TEXT}&#10;&#10;Return JSON only."
              aria-invalid={errors.prompt ? "true" : undefined}
              className="font-mono text-xs h-60"
            />
            {errors.prompt ? (
              <p className="font-mono text-xs text-destructive">{errors.prompt.message}</p>
            ) : (
              <p className="text-[10px] text-muted-foreground/60 font-mono">
                <code className="text-blue-400">{"{INPUT_TEXT}"}</code> specifies where the input
                content should be inserted. If omitted, the input is appended to the end of the
                prompt automatically.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="font-mono text-xs uppercase tracking-wider">
              Output Schema{" "}
              <span className="text-muted-foreground font-normal normal-case">(optional)</span>
            </Label>
            <Controller
              control={control}
              name="schemaFields"
              render={({ field }) => (
                <SchemaBuilder value={field.value} onChange={field.onChange} />
              )}
            />
            {errors.schemaFields && (
              <p className="font-mono text-xs text-destructive">{errors.schemaFields.message}</p>
            )}
          </div>

          <p className="text-[10px] text-muted-foreground/60 font-mono">
            Define the expected shape of the extracted data. When provided, the schema is passed to
            the model as a structured-output constraint.{" "}
            <span className="text-purple-400/70">object[]</span> fields support nested sub-fields.
          </p>
        </div>
      </ScrollArea>
    </form>
  );
}
