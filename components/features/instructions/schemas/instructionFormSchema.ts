import { z } from "zod";

import type { SchemaField } from "@/components/features/instructions/schema-builder/SchemaBuilder";
import { validateSchemaFields } from "@/components/features/instructions/schema-builder/SchemaBuilder";

export const instructionFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required."),
  prompt: z.string().trim().min(1, "Prompt template is required."),
  schemaFields: z
    .custom<SchemaField[]>((value) => Array.isArray(value), "Invalid output schema.")
    .superRefine((fields, ctx) => {
      const schemaError = validateSchemaFields(fields);
      if (!schemaError) return;

      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: schemaError,
      });
    }),
});

export type InstructionFormValues = z.infer<typeof instructionFormSchema>;
