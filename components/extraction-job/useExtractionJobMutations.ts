"use client";

import { useMutation } from "@tanstack/react-query";
import { fetchJson } from "@/lib/fetchJson";
import type { ExtractionJob, ModelOptions } from "./types";

export interface CreateExtractionJobInput {
  title?: string;
  modelName: string;
  instructionId: string;
  datasetId: string;
  modelOptions: ModelOptions;
}

export interface StartExtractionJobResult {
  message: string;
  extractionJobId: string;
  title: string;
  modelName: string;
  instructionTitle: string;
  job: ExtractionJob;
}

export interface StopExtractionJobResult {
  message: string;
  extractionJobId: string;
  title: string;
}

export interface RetryFailedResultsResult {
  message: string;
  extractionJobId: string;
  deletedFailedResultCount: number;
  successfulResultCount: number;
  failedResultCount: number;
  totalInputCount: number;
}

export interface DeleteExtractionJobResult {
  message: string;
  extractionJobId: string;
  title: string;
  deletedResultCount: number;
}

export interface UpdateExtractionJobTitleInput {
  jobId: string;
  title: string;
}

export interface DeleteExtractionResultInput {
  jobId: string;
  resultId: string;
}

export interface DeleteExtractionResultResult {
  message: string;
  extractionJobId: string;
  extractionResultId: string;
  inputLabel: string | null;
  status: string;
  successfulResultCount: number;
  failedResultCount: number;
  totalInputCount: number;
}

export function getMutationErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function useCreateExtractionJobMutation() {
  return useMutation({
    mutationFn: (input: CreateExtractionJobInput) =>
      fetchJson<ExtractionJob>("/api/extraction-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
  });
}

export function useStartExtractionJobMutation() {
  return useMutation({
    mutationFn: (jobId: string) =>
      fetchJson<StartExtractionJobResult>(`/api/extraction-jobs/${jobId}/start`, {
        method: "POST",
      }),
  });
}

export function useStopExtractionJobMutation() {
  return useMutation({
    mutationFn: (jobId: string) =>
      fetchJson<StopExtractionJobResult>(`/api/extraction-jobs/${jobId}/stop`, {
        method: "POST",
      }),
  });
}

export function useRetryFailedResultsMutation() {
  return useMutation({
    mutationFn: (jobId: string) =>
      fetchJson<RetryFailedResultsResult>(`/api/extraction-jobs/${jobId}/retry-failed`, {
        method: "POST",
      }),
  });
}

export function useDeleteExtractionJobMutation() {
  return useMutation({
    mutationFn: (jobId: string) =>
      fetchJson<DeleteExtractionJobResult>(`/api/extraction-jobs/${jobId}`, {
        method: "DELETE",
      }),
  });
}

export function useUpdateExtractionJobTitleMutation() {
  return useMutation({
    mutationFn: ({ jobId, title }: UpdateExtractionJobTitleInput) =>
      fetchJson<ExtractionJob>(`/api/extraction-jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      }),
  });
}

export function useDeleteExtractionResultMutation() {
  return useMutation({
    mutationFn: ({ jobId, resultId }: DeleteExtractionResultInput) =>
      fetchJson<DeleteExtractionResultResult>(
        `/api/extraction-jobs/${jobId}/results/${resultId}`,
        {
          method: "DELETE",
        },
      ),
  });
}
