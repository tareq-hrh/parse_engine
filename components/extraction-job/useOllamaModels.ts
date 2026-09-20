"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/fetchJson";
import { queryKeys } from "@/lib/queryKeys";
import type { OllamaModel } from "./types";

export interface OllamaModelsResponse {
  models: OllamaModel[];
}

export function fetchOllamaModels(): Promise<OllamaModelsResponse> {
  return fetchJson<OllamaModelsResponse>("/api/ollama/models");
}

export function useOllamaModelsQuery() {
  return useQuery({
    queryKey: queryKeys.ollamaModels,
    queryFn: fetchOllamaModels,
  });
}
