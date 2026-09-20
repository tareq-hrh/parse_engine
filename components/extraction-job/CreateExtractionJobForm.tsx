"use client";

import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { Button } from "@/components/shadcn_ui/button";
import { Input } from "@/components/shadcn_ui/input";
import { Label } from "@/components/shadcn_ui/label";
import { ScrollArea } from "@/components/shadcn_ui/scroll-area";
import { Separator } from "@/components/shadcn_ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/shadcn_ui/radio-group";
import { Plus, Loader2, X, Brain, Database, RefreshCcw } from "lucide-react";
import { useDatasetsQuery } from "@/components/dataset/useDatasets";
import { useInstructionsQuery } from "@/components/instruction/useInstructions";
import { ExtractionJob, ModelOptions, OllamaModel } from "./types";
import { SegmentedSelector } from "./SegmentedSelector";
import { formatNumCtx } from "./utils";
import {
  getMutationErrorMessage,
  useCreateExtractionJobMutation,
} from "./useExtractionJobMutations";
import { useOllamaModelsQuery } from "./useOllamaModels";

const EMPTY_MODELS: OllamaModel[] = [];
const EMPTY_INSTRUCTIONS: Array<{ id: string; title: string }> = [];
const EMPTY_DATASETS: Array<{ id: string; name: string; inputCount: number }> = [];

export function CreateExtractionJobForm({
  onCreated,
  onCancel,
}: {
  onCreated: (job: ExtractionJob) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [selectedModel, setSelectedModel] = useState<OllamaModel | null>(null);
  const [selectedInstructionId, setSelectedInstructionId] = useState("");
  const [selectedDatasetId, setSelectedDatasetId] = useState("");
  const modelsQuery = useOllamaModelsQuery();
  const instructionsQuery = useInstructionsQuery();
  const datasetsQuery = useDatasetsQuery();
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
  const instructionsError = instructionsQuery.isError;
  const datasetsError = datasetsQuery.isError;
  const createExtractionJobMutation = useCreateExtractionJobMutation();
  const loading = createExtractionJobMutation.isPending;

  // ── Model Options state ──────────────────────────────────────────────────
  const [temperature, setTemperature] = useState(0);
  const [numCtx, setNumCtx] = useState<number | null>(null);
  const [think, setThink] = useState<string>("false");

  // ── Segmented selector options ───────────────────────────────────────────
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

  useEffect(() => {
    if (models.length === 0) {
      if (selectedModel !== null) setSelectedModel(null);
      return;
    }

    if (!selectedModel || !models.some((model) => model.name === selectedModel.name)) {
      setSelectedModel(models[0]);
    }
  }, [models, selectedModel]);

  useEffect(() => {
    if (instructions.length === 0) {
      if (selectedInstructionId) setSelectedInstructionId("");
      return;
    }

    if (
      !selectedInstructionId ||
      !instructions.some((instruction) => instruction.id === selectedInstructionId)
    ) {
      setSelectedInstructionId(instructions[0].id);
    }
  }, [instructions, selectedInstructionId]);

  useEffect(() => {
    if (datasets.length === 0) {
      if (selectedDatasetId) setSelectedDatasetId("");
      return;
    }

    if (!selectedDatasetId || !datasets.some((dataset) => dataset.id === selectedDatasetId)) {
      setSelectedDatasetId(datasets[0].id);
    }
  }, [datasets, selectedDatasetId]);

  useEffect(() => {
    const updateThink = () => {
      if (selectedModel?.supportsThinking && selectedModel.thinkType === "level") {
        setThink("low");
      } else {
        setThink("false");
      }
    };
    updateThink();
  }, [selectedModel]);

  async function handleCreate() {
    if (!selectedModel) {
      toast.error("Please select an Ollama model.");
      return;
    }
    if (!selectedInstructionId) {
      toast.error("Please select an instruction.");
      return;
    }
    if (!selectedDatasetId) {
      toast.error("Please select a dataset.");
      return;
    }

    try {
      const modelOptions: ModelOptions = { temperature };
      if (numCtx !== null) modelOptions.num_ctx = numCtx;
      if (selectedModel.supportsThinking) {
        const thinkLevel =
          think === "low" || think === "medium" || think === "high" ? think : "low";
        modelOptions.think = selectedModel.thinkType === "boolean" ? think === "true" : thinkLevel;
      }

      const createdJob = await createExtractionJobMutation.mutateAsync({
        title: title.trim() || undefined,
        modelName: selectedModel.name,
        instructionId: selectedInstructionId,
        datasetId: selectedDatasetId,
        modelOptions,
      });
      toast.success("Extraction job created successfully.");
      onCreated(createdJob);
    } catch (error) {
      toast.error(getMutationErrorMessage(error, "Failed to create extraction job."));
    }
  }

  return (
    <>
      <div className="flex shrink-0 flex-col gap-3 border-b border-border bg-surface-panel-header p-5 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-mono text-base font-semibold text-foreground">New Extraction Job</h2>
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
            disabled={loading || modelsLoading || instructionsLoading || datasetsLoading}
            className="flex-1 font-mono text-xs gap-1.5 bg-blue-600 hover:bg-blue-500 text-white sm:flex-none"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {loading ? "Creating..." : "Create Job"}
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-5 space-y-5">
          {/* ── Title ─────────────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <Label htmlFor="job-title" className="font-mono text-xs uppercase tracking-wider">
              Title{" "}
              <span className="text-muted-foreground normal-case tracking-normal">(optional)</span>
            </Label>
            <Input
              id="job-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Default: [Model] - [Instruction]"
              className="font-mono text-sm"
            />
          </div>

          <Separator />

          {/* ── Ollama Model ──────────────────────────────────────────── */}
          <div className="space-y-2">
            <Label className="font-mono text-xs uppercase tracking-wider">
              Ollama Model <span className="text-destructive">*</span>
            </Label>
            {modelsLoading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Fetching installed models...
              </div>
            )}
            {modelsError && (
              <div className="flex items-center gap-2">
                <p className="text-xs text-destructive font-mono">{modelsError}</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    void modelsQuery.refetch();
                  }}
                  className="h-6 px-2 font-mono text-[11px] text-muted-foreground hover:text-foreground gap-1 shrink-0"
                >
                  <RefreshCcw className="size-3" />
                  Retry
                </Button>
              </div>
            )}
            {!modelsLoading && !modelsError && models.length === 0 && (
              <p className="text-xs text-muted-foreground font-mono">
                No models found. Install an Ollama model first:{" "}
                <code className="bg-muted px-1 rounded">ollama pull llama3.2</code>
              </p>
            )}
            {!modelsLoading && !modelsError && models.length > 0 && (
              <RadioGroup
                value={selectedModel?.name ?? ""}
                onValueChange={(name) =>
                  setSelectedModel(models.find((m) => m.name === name) ?? null)
                }
                aria-label="Ollama model"
                className="space-y-1.5"
              >
                {models.map((model) => (
                  <div
                    key={model.name}
                    className={`cursor-pointer transition-all ${
                      selectedModel?.name === model.name
                        ? "border-blue-500/40 bg-blue-500/5"
                        : "border-border bg-card hover:border-blue-500/30"
                    }`}
                  >
                    <Label
                      htmlFor={`model-${model.name}`}
                      className="flex items-center gap-3 p-2.5 border rounded-lg min-w-0 font-mono text-sm text-foreground cursor-pointer"
                    >
                      <RadioGroupItem
                        value={model.name}
                        id={`model-${model.name}`}
                        className="shrink-0"
                      />
                      <span className="min-w-0 flex-1 truncate">{model.name}</span>
                      {model.supportsThinking && (
                        <span className="flex items-center gap-0.5 font-mono text-[10px] text-violet-400 border border-violet-500/30 bg-violet-500/10 px-1.5 py-0.5 rounded shrink-0">
                          <Brain className="size-2.5" />
                          Thinking
                        </span>
                      )}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}
          </div>

          <Separator />

          {/* ── Model Options ─────────────────────────────────────────── */}
          <div className="space-y-4">
            <Label className="font-mono text-xs uppercase tracking-wider">Model Options</Label>

            {/* Temperature */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="font-mono text-xs text-muted-foreground">Temperature</Label>
                <span className="font-mono text-xs text-blue-400">{temperature.toFixed(1)}</span>
              </div>
              <SegmentedSelector
                options={TEMPERATURE_STEPS}
                value={temperature}
                onChange={setTemperature}
                ariaLabel="Temperature"
                formatLabel={(v) => v.toFixed(1)}
              />
              <div className="flex justify-between font-mono text-[10px] text-muted-foreground">
                <span>deterministic</span>
                <span>creative</span>
              </div>
            </div>

            {/* Context Window */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="font-mono text-xs text-muted-foreground">Context Window</Label>
                <span className="font-mono text-xs text-blue-400">{formatNumCtx(numCtx)}</span>
              </div>
              <SegmentedSelector
                options={NUM_CTX_OPTIONS}
                value={numCtx}
                onChange={setNumCtx}
                ariaLabel="Context window"
                formatLabel={formatNumCtx}
              />
              <p className="font-mono text-[10px] text-muted-foreground">
                Increase this if long inputs are being truncated. Auto uses the Ollama default.
              </p>
            </div>

            {/* Think — only for thinking models */}
            {selectedModel?.supportsThinking && (
              <div className="space-y-1.5">
                <Label className="font-mono text-xs text-muted-foreground flex items-center gap-1.5">
                  <Brain className="w-3.5 h-3.5 text-violet-400" />
                  Thinking Mode
                </Label>
                {selectedModel.thinkType === "boolean" ? (
                  <RadioGroup
                    value={think}
                    onValueChange={setThink}
                    aria-label="Thinking mode"
                    className="flex gap-2"
                  >
                    {["false", "true"].map((val) => (
                      <Label
                        key={val}
                        htmlFor={`think-${val}`}
                        className={`flex items-center justify-center flex-1 gap-2 px-3 py-1.5 border rounded-lg transition-all font-mono text-sm text-foreground cursor-pointer ${
                          think === val
                            ? "border-violet-500/40 bg-violet-500/5"
                            : "border-border bg-card hover:border-violet-500/30"
                        }`}
                      >
                        <RadioGroupItem value={val} id={`think-${val}`} />
                        {val === "true" ? "Enabled" : "Disabled"}
                      </Label>
                    ))}
                  </RadioGroup>
                ) : (
                  <RadioGroup
                    value={think}
                    onValueChange={setThink}
                    aria-label="Thinking level"
                    className="flex gap-2"
                  >
                    {["low", "medium", "high"].map((level) => (
                      <Label
                        key={level}
                        htmlFor={`think-${level}`}
                        className={`flex items-center justify-center flex-1 gap-2 px-3 py-1.5 border rounded-lg transition-all font-mono text-sm text-foreground cursor-pointer capitalize ${
                          think === level
                            ? "border-violet-500/40 bg-violet-500/5"
                            : "border-border bg-card hover:border-violet-500/30"
                        }`}
                      >
                        <RadioGroupItem value={level} id={`think-${level}`} />
                        {level}
                      </Label>
                    ))}
                  </RadioGroup>
                )}
                <p className="font-mono text-[10px] text-muted-foreground">
                  Thinking increases processing time. For extraction tasks, disabling it is usually faster.
                </p>
              </div>
            )}
          </div>

          <Separator />

          {/* ── Dataset ───────────────────────────────────────────────── */}
          <div className="space-y-2">
            <Label className="font-mono text-xs uppercase tracking-wider">
              Dataset <span className="text-destructive">*</span>
            </Label>
            {datasetsLoading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Loading datasets...
              </div>
            )}
            {!datasetsLoading && datasetsError && (
              <div className="flex items-center gap-2">
                <p className="text-xs text-destructive font-mono">Failed to load datasets.</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    void datasetsQuery.refetch();
                  }}
                  className="h-6 px-2 font-mono text-[11px] text-muted-foreground hover:text-foreground gap-1 shrink-0"
                >
                  <RefreshCcw className="size-3" />
                  Retry
                </Button>
              </div>
            )}
            {!datasetsLoading && !datasetsError && datasets.length === 0 && (
              <p className="text-xs text-muted-foreground font-mono">
                No datasets found. Go to the Datasets tab and create one first.
              </p>
            )}
            {!datasetsLoading && !datasetsError && datasets.length > 0 && (
              <RadioGroup
                value={selectedDatasetId}
                onValueChange={setSelectedDatasetId}
                aria-label="Dataset"
                className="space-y-1.5"
              >
                {datasets.map((ds) => (
                  <Label
                    key={ds.id}
                    htmlFor={`dataset-${ds.id}`}
                    className={`flex items-center gap-3 p-2.5 border rounded-lg transition-all font-mono text-sm text-foreground cursor-pointer ${
                      selectedDatasetId === ds.id
                        ? "border-blue-500/40 bg-blue-500/5"
                        : "border-border bg-card hover:border-blue-500/30"
                    }`}
                  >
                    <RadioGroupItem value={ds.id} id={`dataset-${ds.id}`} />
                    <Database className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="flex-1 truncate">{ds.name}</span>
                    <span className="text-[11px] text-muted-foreground shrink-0">
                      {ds.inputCount} inputs
                    </span>
                  </Label>
                ))}
              </RadioGroup>
            )}
          </div>

          <Separator />

          {/* ── Instruction ───────────────────────────────────────────── */}
          <div className="space-y-2">
            <Label className="font-mono text-xs uppercase tracking-wider">
              Instruction <span className="text-destructive">*</span>
            </Label>
            {instructionsLoading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Loading instructions...
              </div>
            )}
            {!instructionsLoading && instructionsError && (
              <div className="flex items-center gap-2">
                <p className="text-xs text-destructive font-mono">Failed to load instructions.</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    void instructionsQuery.refetch();
                  }}
                  className="h-6 px-2 font-mono text-[11px] text-muted-foreground hover:text-foreground gap-1 shrink-0"
                >
                  <RefreshCcw className="size-3" />
                  Retry
                </Button>
              </div>
            )}
            {!instructionsLoading && !instructionsError && instructions.length === 0 && (
              <p className="text-xs text-muted-foreground font-mono">
                No instructions found. Go to the Instructions tab and create one first.
              </p>
            )}
            {!instructionsLoading && !instructionsError && instructions.length > 0 && (
              <RadioGroup
                value={selectedInstructionId}
                onValueChange={setSelectedInstructionId}
                aria-label="Instruction"
                className="space-y-1.5"
              >
                {instructions.map((inst) => (
                  <Label
                    key={inst.id}
                    htmlFor={`instruction-${inst.id}`}
                    className={`flex items-center gap-3 p-2.5 border rounded-lg transition-all font-mono text-sm text-foreground cursor-pointer ${
                      selectedInstructionId === inst.id
                        ? "border-blue-500/40 bg-blue-500/5"
                        : "border-border bg-card hover:border-blue-500/30"
                    }`}
                  >
                    <RadioGroupItem value={inst.id} id={`instruction-${inst.id}`} className="shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{inst.title}</span>
                  </Label>
                ))}
              </RadioGroup>
            )}
          </div>

        </div>
      </ScrollArea>
    </>
  );
}
