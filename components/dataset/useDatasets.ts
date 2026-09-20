"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/fetchJson";
import { queryKeys } from "@/lib/queryKeys";
import type { Dataset } from "./types";

export function fetchDatasets(): Promise<Dataset[]> {
  return fetchJson<Dataset[]>("/api/datasets");
}

export function useDatasetsQuery() {
  return useQuery({
    queryKey: queryKeys.datasets,
    queryFn: fetchDatasets,
  });
}
