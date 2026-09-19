"use client";

import { useState } from "react";
import { toast } from "react-toastify";
import { Button } from "@/components/shadcn_ui/button";
import { Input } from "@/components/shadcn_ui/input";
import { Label } from "@/components/shadcn_ui/label";
import { ScrollArea } from "@/components/shadcn_ui/scroll-area";
import { Textarea } from "@/components/shadcn_ui/textarea";
import { Loader2, Save, X } from "lucide-react";
import { Instruction } from "./types";
import {
  SchemaBuilder,
  SchemaField,
  buildOutputSchema,
  schemaToSchemaFields,
  validateSchemaFields,
} from "./SchemaBuilder";

export function EditInstructionForm({
  instruction,
  onUpdated,
  onCancel,
}: {
  instruction: Instruction;
  onUpdated: (updatedInstruction: Instruction) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(instruction.title);
  const [prompt, setPrompt] = useState(instruction.prompt);
  const [schemaFields, setSchemaFields] = useState<SchemaField[]>(() =>
    schemaToSchemaFields(instruction.outputSchema),
  );
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (!title.trim()) {
      toast.error("Title is required.");
      return;
    }
    if (!prompt.trim()) {
      toast.error("Prompt template is required.");
      return;
    }

    const schemaError = validateSchemaFields(schemaFields);
    if (schemaError) {
      toast.error(schemaError);
      return;
    }

    const parsedSchema = buildOutputSchema(schemaFields);

    setLoading(true);
    try {
      const res = await fetch(`/api/instructions/${instruction.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          prompt: prompt.trim(),
          outputSchema: parsedSchema,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to update instruction.");
        return;
      }

      toast.success("Instruction updated.");
      onUpdated(data);
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="flex shrink-0 flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-mono text-base font-semibold text-foreground">Edit Instruction</h2>
        <div className="flex gap-2 sm:justify-end">
          <Button
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
              htmlFor="edit-instruction-title"
              className="font-mono text-xs uppercase tracking-wider"
            >
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-instruction-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Invoice Extraction v1"
              className="font-mono text-sm"
            />
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
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="You are an information extraction engine. Extract structured data from the following input:&#10;&#10;{INPUT_TEXT}&#10;&#10;Return JSON only."
              className="font-mono text-xs h-60"
            />
            <p className="text-[10px] text-muted-foreground/60 font-mono">
              <code className="text-blue-400">{"{INPUT_TEXT}"}</code> specifies where the input
              content should be inserted. If omitted, the input is appended to the end of the prompt
              automatically.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="font-mono text-xs uppercase tracking-wider">
              Output Schema{" "}
              <span className="text-muted-foreground font-normal normal-case">(optional)</span>
            </Label>
            <SchemaBuilder value={schemaFields} onChange={setSchemaFields} />
          </div>

          <p className="text-[10px] text-muted-foreground/60 font-mono">
            Define the expected shape of the extracted data. When provided, the schema is passed to
            the model as a structured-output constraint.{" "}
            <span className="text-purple-400/70">object[]</span> fields support nested sub-fields.
          </p>

        </div>
      </ScrollArea>
    </>
  );
}
