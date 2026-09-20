"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/fetchJson";
import { queryKeys } from "@/lib/queryKeys";
import type { ExtractionJob } from "./types";

export function fetchExtractionJobs(): Promise<ExtractionJob[]> {
  return fetchJson<ExtractionJob[]>("/api/extraction-jobs");
}

export function useExtractionJobsQuery() {
  return useQuery({
    queryKey: queryKeys.extractionJobs,
    queryFn: fetchExtractionJobs,
  });
}
