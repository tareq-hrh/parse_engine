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
import { Dataset, RightPanelMode } from "@/components/features/datasets/types";
import { DatasetCard } from "@/components/features/datasets/cards/DatasetCard";
import { CreateDatasetForm } from "@/components/features/datasets/forms/CreateDatasetForm";
import { EditDatasetForm } from "@/components/features/datasets/forms/EditDatasetForm";
import { ViewDataset } from "@/components/features/datasets/detail/ViewDataset";
import { useDatasetsQuery } from "@/components/features/datasets/hooks/useDatasets";
import {
  getDatasetMutationErrorMessage,
  useDeleteDatasetMutation,
} from "@/components/features/datasets/hooks/useDatasetMutations";

const EMPTY_DATASETS: Dataset[] = [];
const DATASET_LIST_PAGE_SIZE = 10;

function EmptyState() {
  return (
    <div className="flex-1 flex pt-15 justify-center text-muted-foreground text-sm font-mono">
      ← Select a dataset to view details
    </div>
  );
}

export function DatasetPanel() {
  const queryClient = useQueryClient();
  const datasetsQuery = useDatasetsQuery();
  const datasets = datasetsQuery.data ?? EMPTY_DATASETS;
  const loading = datasetsQuery.isLoading;
  const datasetsError = datasetsQuery.isError;
  const deleteDatasetMutation = useDeleteDatasetMutation();
  const deleteLoading = deleteDatasetMutation.isPending;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<RightPanelMode>("empty");

  function updateDatasets(updater: (datasets: Dataset[]) => Dataset[]) {
    queryClient.setQueryData<Dataset[]>(queryKeys.datasets, (current) =>
      updater(current ?? EMPTY_DATASETS),
    );
  }

  function handleSelectDataset(id: string) {
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

  function handleCreated(newDataset: Dataset) {
    setDatasetsPage(1);
    updateDatasets((prev) => [
      newDataset,
      ...prev.filter((dataset) => dataset.id !== newDataset.id),
    ]);
    setSelectedId(newDataset.id);
    setMode("view");
  }

  function handleUpdated(updatedDataset: Dataset) {
    updateDatasets((prev) =>
      prev.map((dataset) => (dataset.id === updatedDataset.id ? updatedDataset : dataset)),
    );
    setSelectedId(updatedDataset.id);
    setMode("view");
  }

  async function handleDeleteDataset(): Promise<boolean> {
    const selectedDataset = datasets.find((dataset) => dataset.id === selectedId);
    if (!selectedDataset) return false;

    try {
      const data = await deleteDatasetMutation.mutateAsync(selectedDataset.slug);

      updateDatasets((prev) => prev.filter((dataset) => dataset.id !== selectedDataset.id));
      queryClient.removeQueries({ queryKey: queryKeys.dataset(selectedDataset.slug) });
      queryClient.removeQueries({
        queryKey: queryKeys.datasetInputPages(selectedDataset.slug),
      });
      setSelectedId(null);
      setMode("empty");
      toast.success(data.message || "Dataset deleted.");
      return true;
    } catch (error) {
      toast.error(getDatasetMutationErrorMessage(error, "Failed to delete dataset."));
      return false;
    }
  }

  // Called after any inputs are added so the input count updates in the card
  function handleInputsChanged() {
    void queryClient.invalidateQueries({ queryKey: queryKeys.datasets });
  }

  const selectedDataset = datasets.find((dataset) => dataset.id === selectedId) ?? null;
  const {
    page: datasetsPage,
    totalItems: datasetTotalItems,
    totalPages: datasetTotalPages,
    paginatedItems: paginatedDatasets,
    setPage: setDatasetsPage,
  } = useClientListPagination({
    items: datasets,
    pageSize: DATASET_LIST_PAGE_SIZE,
  });

  return (
    <WorkspacePanelShell
      showDetail={mode !== "empty"}
      backLabel="Datasets"
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
              {datasets.length} {datasets.length === 1 ? "Dataset" : "Datasets"}
            </span>
          </div>

          <ScrollArea>
            <div className="space-y-2">
              {loading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              )}
              {!loading && !datasetsError && datasets.length === 0 && (
                <p className="text-center text-xs text-muted-foreground font-mono py-8">
                  No datasets yet.
                  <br />
                  Create your first one.
                </p>
              )}
              {!loading && datasetsError && (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <p className="text-xs text-destructive font-mono">
                    Failed to load datasets.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      void datasetsQuery.refetch();
                    }}
                    className="font-mono text-xs gap-1.5"
                  >
                    <RefreshCcw className="size-3.5" />
                    Retry
                  </Button>
                </div>
              )}
              {!loading &&
                !datasetsError &&
                paginatedDatasets.map((dataset) => (
                  <DatasetCard
                    key={dataset.id}
                    dataset={dataset}
                    isSelected={selectedId === dataset.id}
                    onClick={() => handleSelectDataset(dataset.id)}
                  />
                ))}
            </div>
          </ScrollArea>
          {!loading && !datasetsError && (
            <ListPaginationControls
              page={datasetsPage}
              totalItems={datasetTotalItems}
              totalPages={datasetTotalPages}
              itemLabel="dataset"
              isFetching={datasetsQuery.isFetching && !loading}
              onPageChange={setDatasetsPage}
            />
          )}
        </>
      }
      detail={
        <>
          {mode === "empty" && <EmptyState />}

          {mode === "view" && selectedDataset && (
            <ViewDataset
              dataset={selectedDataset}
              onEditDataset={handleOpenEdit}
              deleteLoading={deleteLoading}
              onDeleteDataset={handleDeleteDataset}
              onInputsChanged={handleInputsChanged}
            />
          )}

          {mode === "create" && (
            <CreateDatasetForm onCreated={handleCreated} onCancel={handleCancelCreate} />
          )}
          {mode === "edit" && selectedDataset && (
            <EditDatasetForm
              key={selectedDataset.id}
              dataset={selectedDataset}
              onUpdated={handleUpdated}
              onCancel={handleCancelEdit}
            />
          )}
        </>
      }
    />
  );
}
