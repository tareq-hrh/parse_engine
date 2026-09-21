"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/fetchJson";
import { queryKeys } from "@/lib/queryKeys";
import type { Instruction } from "@/components/features/instructions/types";

export function fetchInstructions(): Promise<Instruction[]> {
  return fetchJson<Instruction[]>("/api/instructions");
}

export function useInstructionsQuery() {
  return useQuery({
    queryKey: queryKeys.instructions,
    queryFn: fetchInstructions,
  });
}
