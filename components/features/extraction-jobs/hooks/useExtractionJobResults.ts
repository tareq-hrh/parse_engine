"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/fetchJson";
import { queryKeys } from "@/lib/queryKeys";
import type { ExtractionJob, ExtractionResult } from "@/components/features/extraction-jobs/types";

export interface ExtractionJobResultsSnapshot {
  extractionJobId: string;
  successfulResultCount: number;
  failedResultCount: number;
  job: ExtractionJob;
  successfulResults: ExtractionResult[];
  failedResults: ExtractionResult[];
}

export function fetchExtractionJobResults(
  jobId: string,
): Promise<ExtractionJobResultsSnapshot> {
  return fetchJson<ExtractionJobResultsSnapshot>(`/api/extraction-jobs/${jobId}/results`);
}

export function useExtractionJobResultsQuery(jobId: string | null) {
  return useQuery({
    queryKey: jobId ? queryKeys.extractionJobResults(jobId) : queryKeys.extractionJobResults(""),
    queryFn: () => fetchExtractionJobResults(jobId!),
    enabled: jobId !== null,
  });
}
