"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { Button } from "@/components/shadcn_ui/button";
import { ScrollArea } from "@/components/shadcn_ui/scroll-area";
import { ListPaginationControls } from "@/components/workspace/ListPaginationControls";
import { WorkspacePanelShell } from "@/components/workspace/WorkspacePanelShell";
import { useClientListPagination } from "@/components/workspace/useClientListPagination";
import { Plus, Loader2, RefreshCcw } from "lucide-react";
import { queryKeys } from "@/lib/queryKeys";
import { Instruction, RightPanelMode } from "@/components/features/instructions/types";
import { InstructionCard } from "@/components/features/instructions/cards/InstructionCard";
import { ViewInstruction } from "@/components/features/instructions/detail/ViewInstruction";
import { CreateInstructionForm } from "@/components/features/instructions/forms/CreateInstructionForm";
import { EditInstructionForm } from "@/components/features/instructions/forms/EditInstructionForm";
import { useInstructionsQuery } from "@/components/features/instructions/hooks/useInstructions";
import {
  getInstructionMutationErrorMessage,
  useDeleteInstructionMutation,
} from "@/components/features/instructions/hooks/useInstructionMutations";

const EMPTY_INSTRUCTIONS: Instruction[] = [];
const INSTRUCTION_LIST_PAGE_SIZE = 10;

// ── Right Panel: Empty State ──────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex-1 flex pt-15 justify-center text-muted-foreground text-sm font-mono">
      ← Select an instruction to view details
    </div>
  );
}

// ── Main InstructionPanel ─────────────────────────────────────────────────────
export function InstructionPanel() {
  const queryClient = useQueryClient();
  const instructionsQuery = useInstructionsQuery();
  const instructions = instructionsQuery.data ?? EMPTY_INSTRUCTIONS;
  const loading = instructionsQuery.isLoading;
  const instructionsError = instructionsQuery.isError;
  const deleteInstructionMutation = useDeleteInstructionMutation();
  const deleteLoading = deleteInstructionMutation.isPending;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<RightPanelMode>("empty");

  function updateInstructions(updater: (instructions: Instruction[]) => Instruction[]) {
    queryClient.setQueryData<Instruction[]>(queryKeys.instructions, (current) =>
      updater(current ?? EMPTY_INSTRUCTIONS),
    );
  }

  function handleSelectInstruction(id: string) {
    setSelectedId(id);
    setMode("view");
  }

  function handleBackToList() {
    setSelectedId(null);
    setMode("empty");
  }

  function handleOpenCreate() {
    setSelectedId(null);
    setMode("create");
  }

  function handleCancelCreate() {
    setMode(selectedId ? "view" : "empty");
  }

  function handleOpenEdit() {
    setMode("edit");
  }

  function handleCancelEdit() {
    setMode(selectedId ? "view" : "empty");
  }

  function handleCreated(newInstruction: Instruction) {
    setInstructionsPage(1);
    updateInstructions((prev) => [
      newInstruction,
      ...prev.filter((instruction) => instruction.id !== newInstruction.id),
    ]);
    setSelectedId(newInstruction.id);
    setMode("view");
  }

  function handleUpdated(updatedInstruction: Instruction) {
    updateInstructions((prev) =>
      prev.map((instruction) =>
        instruction.id === updatedInstruction.id ? updatedInstruction : instruction,
      ),
    );
    setSelectedId(updatedInstruction.id);
    setMode("view");
  }

  async function handleDeleteInstruction(): Promise<boolean> {
    if (!selectedId) return false;

    const instructionId = selectedId;
    try {
      const data = await deleteInstructionMutation.mutateAsync(instructionId);

      updateInstructions((prev) => prev.filter((instruction) => instruction.id !== instructionId));
      queryClient.removeQueries({ queryKey: queryKeys.instruction(instructionId) });
      setSelectedId(null);
      setMode("empty");
      toast.success(data.message || "Instruction deleted.");
      return true;
    } catch (error) {
      toast.error(getInstructionMutationErrorMessage(error, "Failed to delete instruction."));
      return false;
    }
  }

  const selectedInstruction = instructions.find((instruction) => instruction.id === selectedId) ?? null;
  const {
    page: instructionsPage,
    totalItems: instructionTotalItems,
    totalPages: instructionTotalPages,
    paginatedItems: paginatedInstructions,
    setPage: setInstructionsPage,
  } = useClientListPagination({
    items: instructions,
    pageSize: INSTRUCTION_LIST_PAGE_SIZE,
  });

  return (
    <WorkspacePanelShell
      showDetail={mode !== "empty"}
      backLabel="Instructions"
      onBack={handleBackToList}
      list={
        <>
          <div className="flex items-center justify-between shrink-0">
            <Button
              size="sm"
              onClick={handleOpenCreate}
              className="font-mono text-xs gap-1.5 bg-green-600 hover:bg-green-500 text-white"
            >
              <Plus className="w-3.5 h-3.5" />
              New
            </Button>
            <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
              {instructions.length} {instructions.length === 1 ? "Instruction" : "Instructions"}
            </span>
          </div>

          <ScrollArea className="flex-1">
            <div className="space-y-2">
              {loading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              )}
              {!loading && !instructionsError && instructions.length === 0 && (
                <p className="text-center text-xs text-muted-foreground font-mono py-8">
                  No instructions yet.
                  <br />
                  Create your first one.
                </p>
              )}
              {!loading && instructionsError && (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <p className="text-xs text-destructive font-mono">
                    Failed to load instructions.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      void instructionsQuery.refetch();
                    }}
                    className="font-mono text-xs gap-1.5"
                  >
                    <RefreshCcw className="size-3.5" />
                    Retry
                  </Button>
                </div>
              )}
              {!loading &&
                !instructionsError &&
                paginatedInstructions.map((instruction) => (
                  <InstructionCard
                    key={instruction.id}
                    instruction={instruction}
                    isSelected={selectedId === instruction.id}
                    onClick={() => handleSelectInstruction(instruction.id)}
                  />
                ))}
            </div>
          </ScrollArea>
          {!loading && !instructionsError && (
            <ListPaginationControls
              page={instructionsPage}
              totalItems={instructionTotalItems}
              totalPages={instructionTotalPages}
              itemLabel="instruction"
              isFetching={instructionsQuery.isFetching && !loading}
              onPageChange={setInstructionsPage}
            />
          )}
        </>
      }
      detail={
        <>
          {mode === "empty" && <EmptyState />}
          {mode === "view" && selectedInstruction && (
            <ViewInstruction
              instruction={selectedInstruction}
              onEditInstruction={handleOpenEdit}
              deleteLoading={deleteLoading}
              onDeleteInstruction={handleDeleteInstruction}
            />
          )}
          {mode === "create" && (
            <CreateInstructionForm onCreated={handleCreated} onCancel={handleCancelCreate} />
          )}
          {mode === "edit" && selectedInstruction && (
            <EditInstructionForm
              key={selectedInstruction.id}
              instruction={selectedInstruction}
              onUpdated={handleUpdated}
              onCancel={handleCancelEdit}
            />
          )}
        </>
      }
    />
  );
}
