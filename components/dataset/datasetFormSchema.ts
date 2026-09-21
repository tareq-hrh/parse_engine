import { z } from "zod";

export const datasetFormSchema = z.object({
  name: z.string().trim().min(1, "Dataset name is required."),
  description: z.string().trim(),
});

export type DatasetFormValues = z.infer<typeof datasetFormSchema>;
