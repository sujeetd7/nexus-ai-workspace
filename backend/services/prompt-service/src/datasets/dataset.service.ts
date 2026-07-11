import { PromptDataset, PromptDatasetCase } from "./dataset.types";

export class DatasetService {
  private readonly datasets = new Map<string, PromptDataset>();

  create(
    name: string,
    cases: PromptDatasetCase[],
    description?: string,
  ): PromptDataset {
    const dataset: PromptDataset = {
      id: `dataset-${Date.now()}`,
      name,
      description,
      cases,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.datasets.set(dataset.id, dataset);
    return dataset;
  }

  list(): PromptDataset[] {
    return Array.from(this.datasets.values());
  }

  get(id: string): PromptDataset | undefined {
    return this.datasets.get(id);
  }

  update(
    id: string,
    updates: Partial<Pick<PromptDataset, "name" | "description" | "cases">>,
  ): PromptDataset | undefined {
    const dataset = this.datasets.get(id);

    if (!dataset) {
      return undefined;
    }

    const nextDataset: PromptDataset = {
      ...dataset,
      ...updates,
      updatedAt: new Date(),
    };

    this.datasets.set(id, nextDataset);
    return nextDataset;
  }

  delete(id: string): boolean {
    return this.datasets.delete(id);
  }

  addCase(id: string, item: PromptDatasetCase): PromptDataset | undefined {
    const dataset = this.datasets.get(id);

    if (!dataset) {
      return undefined;
    }

    const nextDataset = {
      ...dataset,
      cases: [...dataset.cases, item],
      updatedAt: new Date(),
    };

    this.datasets.set(id, nextDataset);
    return nextDataset;
  }

  removeCase(id: string, caseId: string): PromptDataset | undefined {
    const dataset = this.datasets.get(id);

    if (!dataset) {
      return undefined;
    }

    const nextDataset = {
      ...dataset,
      cases: dataset.cases.filter((item) => item.id !== caseId),
      updatedAt: new Date(),
    };

    this.datasets.set(id, nextDataset);
    return nextDataset;
  }
}
