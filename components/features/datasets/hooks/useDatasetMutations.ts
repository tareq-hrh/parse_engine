"use client";

import { useMutation } from "@tanstack/react-query";
import { fetchJson } from "@/lib/fetchJson";
import type { DeleteDatasetInputResult } from "@/lib/datasetInputDelete";
import type { DeleteDatasetResult } from "@/lib/datasetDelete";
import type { IngestionMethod } from "@/lib/datasetInputContracts";
import type { Dataset, InputIngestionResult } from "@/components/features/datasets/types";

export interface CreateDatasetInput {
  name: string;
  description?: string;
}

export interface UpdateDatasetInput {
  slug: string;
  name: string;
  description: string | null;
}

export interface AddDatasetInputsInput {
  datasetId: string;
  ingestionMethod: IngestionMethod;
  inputs: Array<{
    label: string;
    content: string;
  }>;
}

export type DeleteDatasetResponse = DeleteDatasetResult & { message: string };

export type DeleteDatasetInputResponse = DeleteDatasetInputResult & { message: string };

export function getDatasetMutationErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function useCreateDatasetMutation() {
  return useMutation({
    mutationFn: (input: CreateDatasetInput) =>
      fetchJson<Dataset>("/api/datasets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
  });
}

export function useUpdateDatasetMutation() {
  return useMutation({
    mutationFn: ({ slug, name, description }: UpdateDatasetInput) =>
      fetchJson<Dataset>(`/api/datasets/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      }),
  });
}

export function useDeleteDatasetMutation() {
  return useMutation({
    mutationFn: (slug: string) =>
      fetchJson<DeleteDatasetResponse>(`/api/datasets/${slug}`, {
        method: "DELETE",
      }),
  });
}

export function useAddDatasetInputsMutation() {
  return useMutation({
    mutationFn: (input: AddDatasetInputsInput) =>
      fetchJson<InputIngestionResult>("/api/dataset-inputs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
  });
}

export function useDeleteDatasetInputMutation() {
  return useMutation({
    mutationFn: (inputId: string) =>
      fetchJson<DeleteDatasetInputResponse>(`/api/dataset-inputs/${inputId}`, {
        method: "DELETE",
      }),
  });
}
