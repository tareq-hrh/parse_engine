import { FetchJsonError, fetchJson } from "./fetchJson";

interface DatasetInputContentResponse {
  content?: unknown;
}

export async function fetchDatasetInputContent(inputId: string): Promise<string> {
  const data = await fetchJson<DatasetInputContentResponse>(`/api/dataset-inputs/${inputId}`);

  if (typeof data.content !== "string") {
    throw new FetchJsonError("Dataset input response did not include content.", 502);
  }

  return data.content;
}

export function getDatasetInputContentErrorMessage(error: unknown): string {
  if (error instanceof FetchJsonError) {
    return error.message;
  }

  return "Network error. Please try again.";
}
