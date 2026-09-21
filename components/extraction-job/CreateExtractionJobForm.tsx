"use client";

import { useEffect, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Brain, Database, FileText, Loader2, Plus, SlidersHorizontal, X } from "lucide-react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "react-toastify";
import { z } from "zod";

import { Button } from "@/components/shadcn_ui/button";
import { Input } from "@/components/shadcn_ui/input";
import { Label } from "@/components/shadcn_ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/shadcn_ui/radio-group";
import { ScrollArea } from "@/components/shadcn_ui/scroll-area";
import { Separator } from "@/components/shadcn_ui/separator";
import type { Dataset } from "@/components/dataset/types";
import { useDatasetsQuery } from "@/components/dataset/useDatasets";
import type { Instruction } from "@/components/instruction/types";
import { useInstructionsQuery } from "@/components/instruction/useInstructions";
import { cn } from "@/lib/shadcn_utils";
import { SearchablePicker } from "./SearchablePicker";
import { SegmentedSelector } from "./SegmentedSelector";
import { ExtractionJob, ModelOptions, OllamaModel } from "./types";
import { formatNumCtx } from "./utils";
import {
  getMutationErrorMessage,
  useCreateExtractionJobMutation,
} from "./useExtractionJobMutations";
import { useOllamaModelsQuery } from "./useOllamaModels";

const EMPTY_MODELS: OllamaModel[] = [];
const EMPTY_INSTRUCTIONS: Instruction[] = [];
const EMPTY_DATASETS: Dataset[] = [];

const TEMPERATURE_STEPS = [0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
const NUM_CTX_OPTIONS: (number | null)[] = [
  null,
  4096,
  8192,
  16384,
  32768,
  65536,
  131072,
  262144,
];
const THINK_VALUES = ["false", "true", "low", "medium", "high"] as const;
const THINK_LEVELS = ["low", "medium", "high"] as const;

const extractionJobFormSchema = z.object({
  title: z.string(),
  datasetId: z.string().min(1, "Choose a dataset."),
  instructionId: z.string().min(1, "Choose an instruction."),
  modelName: z.string().min(1, "Choose an Ollama model."),
  temperature: z.number().min(0).max(1),
  numCtx: z.number().nullable(),
  think: z.enum(THINK_VALUES),
});

type ExtractionJobFormValues = z.infer<typeof extractionJobFormSchema>;
type ThinkingValue = ExtractionJobFormValues["think"];
type ThinkingLevel = (typeof THINK_LEVELS)[number];

function isThinkingLevel(value: ThinkingValue): value is ThinkingLevel {
  return value === "low" || value === "medium" || value === "high";
}

function truncateText(value: string | null | undefined, max = 120): string {
  if (!value) return "";
  return value.length > max ? `${value.slice(0, max)}...` : value;
}

function formatShortDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function SummaryCell({ label, value, meta }: { label: string; value: string; meta: string }) {
  return (
    <div className="min-w-0 space-y-1">
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="truncate font-mono text-sm text-foreground">{value}</p>
      {meta && <p className="font-mono text-[11px] text-muted-foreground">{meta}</p>}
    </div>
  );
}

function SelectionSummary({
  dataset,
  instruction,
  model,
}: {
  dataset: Dataset | null;
  instruction: Instruction | null;
  model: OllamaModel | null;
}) {
  return (
    <div className="grid gap-2 rounded-sm border border-border bg-muted/20 p-3 sm:grid-cols-3">
      <SummaryCell
        label="Dataset"
        value={dataset ? dataset.name : "Not selected"}
        meta={dataset ? `${dataset.inputCount} ${dataset.inputCount === 1 ? "input" : "inputs"}` : ""}
      />
      <SummaryCell
        label="Instruction"
        value={instruction ? instruction.title : "Not selected"}
        meta={instruction?.outputSchema ? "Schema" : instruction ? "No schema" : ""}
      />
      <SummaryCell
        label="Model"
        value={model ? model.name : "Not selected"}
        meta={model?.supportsThinking ? "Thinking" : model ? "Standard" : ""}
      />
    </div>
  );
}

function ThinkingBadge({ model }: { model: OllamaModel }) {
  if (!model.supportsThinking) return null;

  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-sm border border-violet-500/30 bg-violet-500/10 px-1.5 py-0.5 font-mono text-[10px] text-violet-400">
      <Brain className="size-2.5" />
      Thinking
    </span>
  );
}

export function CreateExtractionJobForm({
  onCreated,
  onCancel,
}: {
  onCreated: (job: ExtractionJob) => void;
  onCancel: () => void;
}) {
  const modelsQuery = useOllamaModelsQuery();
  const instructionsQuery = useInstructionsQuery();
  const datasetsQuery = useDatasetsQuery();
  const createExtractionJobMutation = useCreateExtractionJobMutation();

  const models = modelsQuery.data?.models ?? EMPTY_MODELS;
  const instructions = instructionsQuery.data ?? EMPTY_INSTRUCTIONS;
  const datasets = datasetsQuery.data ?? EMPTY_DATASETS;

  const modelsLoading = modelsQuery.isLoading;
  const instructionsLoading = instructionsQuery.isLoading;
  const datasetsLoading = datasetsQuery.isLoading;
  const modelsError =
    modelsQuery.error instanceof Error && modelsQuery.error.message
      ? modelsQuery.error.message
      : modelsQuery.isError
        ? "Could not connect to Ollama. Is it running?"
        : null;
  const instructionsError = instructionsQuery.isError ? "Failed to load instructions." : null;
  const datasetsError = datasetsQuery.isError ? "Failed to load datasets." : null;
  const loading = createExtractionJobMutation.isPending;

  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ExtractionJobFormValues>({
    resolver: zodResolver(extractionJobFormSchema),
    mode: "onChange",
    defaultValues: {
      title: "",
      datasetId: "",
      instructionId: "",
      modelName: "",
      temperature: 0,
      numCtx: null,
      think: "false",
    },
  });

  const selectedModelName = useWatch({ control, name: "modelName" });
  const selectedDatasetId = useWatch({ control, name: "datasetId" });
  const selectedInstructionId = useWatch({ control, name: "instructionId" });
  const selectedTemperature = useWatch({ control, name: "temperature" });
  const selectedNumCtx = useWatch({ control, name: "numCtx" });
  const selectedThink = useWatch({ control, name: "think" });

  const selectedModel = useMemo(
    () => models.find((model) => model.name === selectedModelName) ?? null,
    [models, selectedModelName],
  );
  const selectedDataset = useMemo(
    () => datasets.find((dataset) => dataset.id === selectedDatasetId) ?? null,
    [datasets, selectedDatasetId],
  );
  const selectedInstruction = useMemo(
    () => instructions.find((instruction) => instruction.id === selectedInstructionId) ?? null,
    [instructions, selectedInstructionId],
  );

  useEffect(() => {
    if (models.length === 0) {
      if (selectedModelName) setValue("modelName", "", { shouldValidate: true });
      return;
    }

    const currentModelExists = models.some((model) => model.name === selectedModelName);
    if (!selectedModelName && models.length === 1) {
      setValue("modelName", models[0].name, { shouldValidate: true });
      return;
    }

    if (selectedModelName && !currentModelExists) {
      setValue("modelName", models.length === 1 ? models[0].name : "", {
        shouldValidate: true,
      });
    }
  }, [models, selectedModelName, setValue]);

  useEffect(() => {
    if (selectedDatasetId && !datasets.some((dataset) => dataset.id === selectedDatasetId)) {
      setValue("datasetId", "", { shouldValidate: true });
    }
  }, [datasets, selectedDatasetId, setValue]);

  useEffect(() => {
    if (
      selectedInstructionId &&
      !instructions.some((instruction) => instruction.id === selectedInstructionId)
    ) {
      setValue("instructionId", "", { shouldValidate: true });
    }
  }, [instructions, selectedInstructionId, setValue]);

  useEffect(() => {
    if (!selectedModel?.supportsThinking) {
      if (selectedThink !== "false") setValue("think", "false");
      return;
    }

    if (selectedModel.thinkType === "level") {
      if (!isThinkingLevel(selectedThink)) setValue("think", "low");
      return;
    }

    if (selectedThink !== "false" && selectedThink !== "true") {
      setValue("think", "false");
    }
  }, [selectedModel, selectedThink, setValue]);

  const catalogLoading = modelsLoading || datasetsLoading || instructionsLoading;
  const catalogBlocked =
    Boolean(modelsError) ||
    Boolean(datasetsError) ||
    Boolean(instructionsError) ||
    models.length === 0 ||
    datasets.length === 0 ||
    instructions.length === 0;
  const missingRequired = !selectedModelName || !selectedDatasetId || !selectedInstructionId;
  const submitDisabled = loading || catalogLoading || catalogBlocked || missingRequired;

  async function handleCreate(values: ExtractionJobFormValues) {
    const model = models.find((candidate) => candidate.name === values.modelName) ?? null;
    if (!model) {
      setValue("modelName", "", { shouldValidate: true });
      toast.error("Please select an available Ollama model.");
      return;
    }

    try {
      const modelOptions: ModelOptions = { temperature: values.temperature };
      if (values.numCtx !== null) modelOptions.num_ctx = values.numCtx;
      if (model.supportsThinking) {
        modelOptions.think =
          model.thinkType === "boolean"
            ? values.think === "true"
            : isThinkingLevel(values.think)
              ? values.think
              : "low";
      }

      const createdJob = await createExtractionJobMutation.mutateAsync({
        title: values.title.trim() || undefined,
        modelName: model.name,
        instructionId: values.instructionId,
        datasetId: values.datasetId,
        modelOptions,
      });
      toast.success("Extraction job created successfully.");
      onCreated(createdJob);
    } catch (error) {
      toast.error(getMutationErrorMessage(error, "Failed to create extraction job."));
    }
  }

  return (
    <form
      id="create-extraction-job-form"
      onSubmit={handleSubmit(handleCreate)}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="flex shrink-0 flex-col gap-3 border-b border-border bg-surface-panel-header p-5 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-mono text-base font-semibold text-foreground">New Extraction Job</h2>
        <div className="flex gap-2 sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="flex-1 gap-1.5 font-mono text-xs text-muted-foreground sm:flex-none"
          >
            <X className="size-3.5" />
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={submitDisabled}
            className="flex-1 gap-1.5 bg-blue-600 font-mono text-xs text-white hover:bg-blue-500 sm:flex-none"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            {loading ? "Creating..." : "Create Job"}
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-5 p-5">
          <div className="space-y-1.5">
            <Label htmlFor="job-title" className="font-mono text-xs uppercase tracking-wider">
              Title{" "}
              <span className="text-muted-foreground normal-case tracking-normal">(optional)</span>
            </Label>
            <Input
              id="job-title"
              {...register("title")}
              placeholder="Default: [Model] - [Instruction]"
              className="font-mono text-sm"
            />
          </div>

          <Separator />

          <section className="space-y-3">
            <Label className="font-mono text-xs uppercase tracking-wider">Job Inputs</Label>
            <div className="grid gap-3 xl:grid-cols-2">
              <Controller
                control={control}
                name="datasetId"
                render={({ field }) => (
                  <SearchablePicker
                    id="job-dataset"
                    label="Dataset"
                    required
                    value={field.value}
                    items={datasets}
                    loading={datasetsLoading}
                    error={datasetsError}
                    emptyMessage="No datasets found. Go to the Datasets tab and create one first."
                    placeholder="Choose dataset"
                    searchPlaceholder="Search datasets..."
                    fieldError={errors.datasetId?.message}
                    onRetry={() => {
                      void datasetsQuery.refetch();
                    }}
                    onValueChange={field.onChange}
                    getValue={(dataset) => dataset.id}
                    getKeywords={(dataset) => [
                      dataset.name,
                      dataset.slug,
                      dataset.description ?? "",
                      `${dataset.inputCount} inputs`,
                    ]}
                    renderSelected={(dataset) => (
                      <span className="flex min-w-0 items-center gap-2">
                        <Database className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate text-foreground">{dataset.name}</span>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {dataset.inputCount} inputs
                        </span>
                      </span>
                    )}
                    renderItem={(dataset) => (
                      <div className="flex min-w-0 gap-2">
                        <Database className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 space-y-1">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="truncate font-mono text-sm text-foreground">
                              {dataset.name}
                            </span>
                            <span className="shrink-0 rounded-sm border border-border bg-muted/40 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                              {dataset.inputCount} inputs
                            </span>
                          </div>
                          {dataset.description && (
                            <p className="line-clamp-2 font-mono text-[11px] leading-relaxed text-muted-foreground">
                              {truncateText(dataset.description)}
                            </p>
                          )}
                          <p className="font-mono text-[10px] text-muted-foreground/70">
                            Updated {formatShortDate(dataset.updatedAt)}
                          </p>
                        </div>
                      </div>
                    )}
                  />
                )}
              />

              <Controller
                control={control}
                name="instructionId"
                render={({ field }) => (
                  <SearchablePicker
                    id="job-instruction"
                    label="Instruction"
                    required
                    value={field.value}
                    items={instructions}
                    loading={instructionsLoading}
                    error={instructionsError}
                    emptyMessage="No instructions found. Go to the Instructions tab and create one first."
                    placeholder="Choose instruction"
                    searchPlaceholder="Search instructions..."
                    fieldError={errors.instructionId?.message}
                    onRetry={() => {
                      void instructionsQuery.refetch();
                    }}
                    onValueChange={field.onChange}
                    getValue={(instruction) => instruction.id}
                    getKeywords={(instruction) => [
                      instruction.title,
                      instruction.prompt,
                      instruction.outputSchema ? "schema structured output json" : "plain prompt",
                    ]}
                    renderSelected={(instruction) => (
                      <span className="flex min-w-0 items-center gap-2">
                        <FileText className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate text-foreground">{instruction.title}</span>
                        {instruction.outputSchema && (
                          <span className="shrink-0 text-[11px] text-blue-400">Schema</span>
                        )}
                      </span>
                    )}
                    renderItem={(instruction) => (
                      <div className="flex min-w-0 gap-2">
                        <FileText className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 space-y-1">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="truncate font-mono text-sm text-foreground">
                              {instruction.title}
                            </span>
                            {instruction.outputSchema && (
                              <span className="shrink-0 rounded-sm border border-blue-500/30 bg-blue-500/10 px-1.5 py-0.5 font-mono text-[10px] text-blue-400">
                                Schema
                              </span>
                            )}
                          </div>
                          <p className="line-clamp-2 font-mono text-[11px] leading-relaxed text-muted-foreground">
                            {truncateText(instruction.prompt)}
                          </p>
                          <p className="font-mono text-[10px] text-muted-foreground/70">
                            Updated {formatShortDate(instruction.updatedAt)}
                          </p>
                        </div>
                      </div>
                    )}
                  />
                )}
              />
            </div>
          </section>

          <Separator />

          <section className="space-y-3">
            <Label className="font-mono text-xs uppercase tracking-wider">Runner</Label>
            <Controller
              control={control}
              name="modelName"
              render={({ field }) => (
                <SearchablePicker
                  id="job-model"
                  label="Ollama Model"
                  required
                  value={field.value}
                  items={models}
                  loading={modelsLoading}
                  error={modelsError}
                  emptyMessage={
                    <span>
                      No models found. Install one first:{" "}
                      <code className="rounded bg-muted px-1">ollama pull llama3.2</code>
                    </span>
                  }
                  placeholder="Choose model"
                  searchPlaceholder="Search models..."
                  fieldError={errors.modelName?.message}
                  onRetry={() => {
                    void modelsQuery.refetch();
                  }}
                  onValueChange={field.onChange}
                  getValue={(model) => model.name}
                  getKeywords={(model) => [
                    model.name,
                    model.supportsThinking ? "thinking" : "standard",
                    model.thinkType,
                  ]}
                  renderSelected={(model) => (
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-foreground">{model.name}</span>
                      <ThinkingBadge model={model} />
                    </span>
                  )}
                  renderItem={(model) => (
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="min-w-0 flex-1 truncate font-mono text-sm text-foreground">
                        {model.name}
                      </span>
                      <ThinkingBadge model={model} />
                    </div>
                  )}
                />
              )}
            />

            <details className="rounded-sm border border-border bg-muted/15">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 marker:hidden">
                <span className="flex min-w-0 items-center gap-2 font-mono text-xs uppercase tracking-wider text-muted-foreground">
                  <SlidersHorizontal className="size-3.5" />
                  Model Options
                </span>
                <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                  Temp {selectedTemperature.toFixed(1)} · Context {formatNumCtx(selectedNumCtx)}
                </span>
              </summary>
              <div className="space-y-4 border-t border-border px-3 py-3">
                <Controller
                  control={control}
                  name="temperature"
                  render={({ field }) => (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="font-mono text-xs text-muted-foreground">
                          Temperature
                        </Label>
                        <span className="font-mono text-xs text-blue-400">
                          {field.value.toFixed(1)}
                        </span>
                      </div>
                      <SegmentedSelector
                        options={TEMPERATURE_STEPS}
                        value={field.value}
                        onChange={field.onChange}
                        ariaLabel="Temperature"
                        formatLabel={(value) => value.toFixed(1)}
                      />
                      <div className="flex justify-between font-mono text-[10px] text-muted-foreground">
                        <span>deterministic</span>
                        <span>creative</span>
                      </div>
                    </div>
                  )}
                />

                <Controller
                  control={control}
                  name="numCtx"
                  render={({ field }) => (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="font-mono text-xs text-muted-foreground">
                          Context Window
                        </Label>
                        <span className="font-mono text-xs text-blue-400">
                          {formatNumCtx(field.value)}
                        </span>
                      </div>
                      <SegmentedSelector
                        options={NUM_CTX_OPTIONS}
                        value={field.value}
                        onChange={field.onChange}
                        ariaLabel="Context window"
                        formatLabel={formatNumCtx}
                      />
                      <p className="font-mono text-[10px] text-muted-foreground">
                        Increase this if long inputs are being truncated. Auto uses the Ollama
                        default.
                      </p>
                    </div>
                  )}
                />

                {selectedModel?.supportsThinking && (
                  <Controller
                    control={control}
                    name="think"
                    render={({ field }) => (
                      <div className="space-y-1.5">
                        <Label className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
                          <Brain className="size-3.5 text-violet-400" />
                          Thinking Mode
                        </Label>
                        {selectedModel.thinkType === "boolean" ? (
                          <RadioGroup
                            value={field.value}
                            onValueChange={field.onChange}
                            aria-label="Thinking mode"
                            className="flex gap-2"
                          >
                            {[
                              { value: "false", label: "Disabled" },
                              { value: "true", label: "Enabled" },
                            ].map((option) => (
                              <ThinkingOption
                                key={option.value}
                                id={`think-${option.value}`}
                                value={option.value}
                                label={option.label}
                                selected={field.value === option.value}
                              />
                            ))}
                          </RadioGroup>
                        ) : (
                          <RadioGroup
                            value={field.value}
                            onValueChange={field.onChange}
                            aria-label="Thinking level"
                            className="flex gap-2"
                          >
                            {THINK_LEVELS.map((level) => (
                              <ThinkingOption
                                key={level}
                                id={`think-${level}`}
                                value={level}
                                label={level}
                                selected={field.value === level}
                              />
                            ))}
                          </RadioGroup>
                        )}
                        <p className="font-mono text-[10px] text-muted-foreground">
                          Thinking increases processing time. For extraction tasks, disabling it is
                          usually faster.
                        </p>
                      </div>
                    )}
                  />
                )}
              </div>
            </details>
          </section>

          <Separator />

          <SelectionSummary
            dataset={selectedDataset}
            instruction={selectedInstruction}
            model={selectedModel}
          />
        </div>
      </ScrollArea>
    </form>
  );
}

function ThinkingOption({
  id,
  value,
  label,
  selected,
}: {
  id: string;
  value: string;
  label: string;
  selected: boolean;
}) {
  return (
    <Label
      htmlFor={id}
      className={cn(
        "flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-sm border px-3 py-1.5 font-mono text-sm capitalize text-foreground transition-all",
        selected
          ? "border-violet-500/40 bg-violet-500/5"
          : "border-border bg-card hover:border-violet-500/30",
      )}
    >
      <RadioGroupItem value={value} id={id} />
      {label}
    </Label>
  );
}
