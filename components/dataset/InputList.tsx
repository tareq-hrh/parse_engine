"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, ChevronLeft, ChevronRight, RefreshCcw } from "lucide-react";
import { Button } from "@/components/shadcn_ui/button";
import { queryKeys } from "@/lib/queryKeys";
import { DatasetInput } from "./types";
import { InputCard } from "./InputCard";
import { DatasetInputsPage, useDatasetInputsQuery } from "./useDatasetInputs";

const INPUT_PAGE_SIZE = 20;
const EMPTY_INPUTS: DatasetInput[] = [];

export function InputList({
  datasetSlug,
  onInputsChanged,
}: {
  datasetSlug: string;
  onInputsChanged: () => void;
}) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const inputsQuery = useDatasetInputsQuery(datasetSlug, page, INPUT_PAGE_SIZE);
  const inputs = inputsQuery.data?.inputs ?? EMPTY_INPUTS;
  const pagination = inputsQuery.data?.pagination ?? null;
  const totalPages = pagination?.totalPages ?? 1;

  function handlePageChange(newPage: number) {
    setPage(newPage);
  }

  function handleInputDeleted(inputId: string) {
    if (inputs.length === 1 && page > 1) {
      setPage(page - 1);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.datasetInputPages(datasetSlug),
      });
      onInputsChanged();
      return;
    }

    queryClient.setQueryData<DatasetInputsPage>(
      queryKeys.datasetInputs(datasetSlug, page, INPUT_PAGE_SIZE),
      (current) => {
        if (!current) return current;
        const total = Math.max(0, current.pagination.total - 1);
        const nextTotalPages = Math.ceil(total / current.pagination.limit);
        return {
          ...current,
          inputs: current.inputs.filter((input) => input.id !== inputId),
          pagination: {
            ...current.pagination,
            total,
            totalPages: nextTotalPages,
            page: nextTotalPages === 0 ? 1 : Math.min(current.pagination.page, nextTotalPages),
          },
        };
      },
    );
    void queryClient.invalidateQueries({
      queryKey: queryKeys.datasetInputPages(datasetSlug),
    });
    onInputsChanged();
  }

  if (inputsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (inputsQuery.isError && !inputsQuery.data) {
    return (
      <div className="flex flex-col items-start gap-2 py-4">
        <p className="text-xs text-destructive font-mono">Failed to load inputs.</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            void inputsQuery.refetch();
          }}
          className="font-mono text-xs gap-1.5"
        >
          <RefreshCcw className="size-3.5" />
          Retry
        </Button>
      </div>
    );
  }

  if (inputs.length === 0) {
    return (
      <p className="text-xs text-muted-foreground font-mono py-4">
        No inputs yet. Open Add and choose Manual, Upload, or API to add inputs.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        {inputs.map((input) => (
          <InputCard key={input.id} input={input} onDeleted={handleInputDeleted} />
        ))}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center gap-2 pt-2">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => handlePageChange(page - 1)}
              className="size-9 p-0"
              aria-label="Go to previous input page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => handlePageChange(page + 1)}
              className="size-9 p-0"
              aria-label="Go to next input page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
          <span className="font-mono text-[11px] text-muted-foreground">
            {pagination.total} inputs · page {page} of {pagination.totalPages}
            {inputsQuery.isFetching && " · loading"}
          </span>
        </div>
      )}
    </div>
  );
}
