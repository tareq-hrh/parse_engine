"use client";

import { useMutation } from "@tanstack/react-query";
import { fetchJson } from "@/lib/fetchJson";
import type { DeleteInstructionResult } from "@/lib/instructionDelete";
import type { Instruction } from "@/components/features/instructions/types";

export interface CreateInstructionInput {
  title: string;
  prompt: string;
  outputSchema: Record<string, unknown> | null;
}

export interface UpdateInstructionInput {
  instructionId: string;
  title: string;
  prompt: string;
  outputSchema: Record<string, unknown> | null;
}

export type DeleteInstructionResponse = DeleteInstructionResult & { message: string };

export function getInstructionMutationErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function useCreateInstructionMutation() {
  return useMutation({
    mutationFn: (input: CreateInstructionInput) =>
      fetchJson<Instruction>("/api/instructions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
  });
}

export function useUpdateInstructionMutation() {
  return useMutation({
    mutationFn: ({ instructionId, title, prompt, outputSchema }: UpdateInstructionInput) =>
      fetchJson<Instruction>(`/api/instructions/${instructionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, prompt, outputSchema }),
      }),
  });
}

export function useDeleteInstructionMutation() {
  return useMutation({
    mutationFn: (instructionId: string) =>
      fetchJson<DeleteInstructionResponse>(`/api/instructions/${instructionId}`, {
        method: "DELETE",
      }),
  });
}
