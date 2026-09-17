import type {
  DuplicateRecord as DatasetInputDuplicateRecord,
  IngestionMethod,
  InputIngestionResult as DatasetInputIngestionResult,
} from "@/lib/datasetInputContracts";

export interface Dataset {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  inputCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DatasetInput {
  id: string;
  datasetId: string;
  label: string;
  contentHash: string;
  ingestionMethod: IngestionMethod;
  createdAt: string;
  updatedAt: string;
  // content is excluded from list responses — only fetched individually
}

export type DuplicateRecord = DatasetInputDuplicateRecord;

export type InputIngestionResult = DatasetInputIngestionResult;

export interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type RightPanelMode = "empty" | "view" | "create";
