"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/fetchJson";
import { queryKeys } from "@/lib/queryKeys";
import type { DatasetInput, PaginationInfo } from "@/components/features/datasets/types";

export interface DatasetInputsPage {
  inputs: DatasetInput[];
  pagination: PaginationInfo;
}

export function fetchDatasetInputs(
  datasetSlug: string,
  page: number,
  limit: number,
): Promise<DatasetInputsPage> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  return fetchJson<DatasetInputsPage>(`/api/datasets/${datasetSlug}/inputs?${params}`);
}

export function useDatasetInputsQuery(datasetSlug: string, page: number, limit: number) {
  return useQuery({
    queryKey: queryKeys.datasetInputs(datasetSlug, page, limit),
    queryFn: () => fetchDatasetInputs(datasetSlug, page, limit),
    placeholderData: (previousData) => previousData,
  });
}
