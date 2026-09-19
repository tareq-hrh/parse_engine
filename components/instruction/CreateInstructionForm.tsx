"use client";

import { useState } from "react";
import { toast } from "react-toastify";
import { Button } from "@/components/shadcn_ui/button";
import { Input } from "@/components/shadcn_ui/input";
import { Label } from "@/components/shadcn_ui/label";
import { Textarea } from "@/components/shadcn_ui/textarea";
import { ScrollArea } from "@/components/shadcn_ui/scroll-area";
import { Plus, Loader2, X } from "lucide-react";
import { Instruction } from "./types";
import { SchemaBuilder, SchemaField, buildOutputSchema, validateSchemaFields } from "./SchemaBuilder";

export function CreateInstructionForm({
  onCreated,
  onCancel,
}: {
  onCreated: (newInstruction: Instruction) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [schemaFields, setSchemaFields] = useState<SchemaField[]>([]);
  const [loading, setLoading] = useState(false);


  async function handleCreate() {
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
      const res = await fetch("/api/instructions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          prompt: prompt.trim(),
          outputSchema: parsedSchema,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to create instruction.");
        return;
      }

      toast.success("Instruction created successfully.");
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
        <h2 className="font-mono text-base font-semibold text-foreground">New Instruction</h2>
        <div className="flex gap-2 sm:justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="flex-1 font-mono text-xs gap-1.5 text-muted-foreground sm:flex-none"
          >
            <X className="w-3.5 h-3.5" />
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
          {/* Title */}
          <div className="space-y-2">
            <Label
              htmlFor="instruction-title"
              className="font-mono text-xs uppercase tracking-wider"
            >
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="instruction-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Invoice Extraction v1"
              className="font-mono text-sm"
            />
          </div>

          {/* Prompt template */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="instruction-prompt"
                className="font-mono text-xs uppercase tracking-wider"
              >
                Prompt Template <span className="text-destructive">*</span>
              </Label>
            </div>
            <Textarea
              id="instruction-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="You are an information extraction engine. Extract structured data from the following input:&#10;&#10;{INPUT_TEXT}&#10;&#10;Return JSON only."
              className="font-mono text-xs h-60"
            />
            {/* Static note */}
            <p className="text-[10px] text-muted-foreground/60 font-mono">
              <code className="text-blue-400">{"{INPUT_TEXT}"}</code> specifies where the input content
              should be inserted. If omitted, the input is appended to the end of the prompt automatically.
            </p>
          </div>

          {/* Output Schema */}
          <div className="space-y-2">
            <Label className="font-mono text-xs uppercase tracking-wider">
              Output Schema{" "}
              <span className="text-muted-foreground font-normal normal-case">(optional)</span>
            </Label>
            <SchemaBuilder value={schemaFields} onChange={setSchemaFields} />
          </div>
          {/* Helper note */}
          <p className="text-[10px] text-muted-foreground/60 font-mono">
            Define the expected shape of the extracted data. When provided, the schema is passed to the
            model as a structured-output constraint. <span className="text-purple-400/70">object[]</span> fields support
            nested sub-fields (e.g. line items).
          </p>
        </div>
      </ScrollArea>
    </>
  );
}
