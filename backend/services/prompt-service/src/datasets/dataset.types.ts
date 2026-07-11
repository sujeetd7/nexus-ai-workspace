export interface PromptDatasetCase {
  id: string;
  variables: Record<string, unknown>;
  expected?: unknown;
}

export interface PromptDataset {
  id: string;
  name: string;
  description?: string;
  cases: PromptDatasetCase[];
  createdAt: Date;
  updatedAt: Date;
}
