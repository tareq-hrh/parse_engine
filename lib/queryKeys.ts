export const queryKeys = {
  extractionJobs: ["extractionJobs"] as const,
  extractionJob: (jobId: string) => ["extractionJob", jobId] as const,
  extractionJobResults: (jobId: string) => ["extractionJobResults", jobId] as const,

  datasets: ["datasets"] as const,
  dataset: (slug: string) => ["dataset", slug] as const,
  datasetInputs: (slug: string, page: number, limit: number) =>
    ["datasetInputs", slug, page, limit] as const,

  instructions: ["instructions"] as const,
  instruction: (instructionId: string) => ["instruction", instructionId] as const,

  ollamaModels: ["ollamaModels"] as const,
};
