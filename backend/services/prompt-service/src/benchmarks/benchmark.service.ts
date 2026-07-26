import { PromptDataset, PromptDatasetCase } from "../datasets/dataset.types";

export interface BenchmarkRunResult {
  id: string;
  datasetId: string;
  datasetName: string;
  cases: Array<{
    caseId: string;
    passed: boolean;
    score: number;
    feedback?: string;
  }>;
  createdAt: Date;
}

export class BenchmarkService {
  private readonly runs = new Map<string, BenchmarkRunResult>();

  async runDataset(
    dataset: PromptDataset,
    executor: (
      caseItem: PromptDatasetCase,
    ) => Promise<{ passed: boolean; score: number; feedback?: string }>,
  ): Promise<BenchmarkRunResult> {
    const cases = await Promise.all(
      dataset.cases.map(async (caseItem) => {
        const result = await executor(caseItem);
        return {
          caseId: caseItem.id,
          passed: result.passed,
          score: result.score,
          feedback: result.feedback,
        };
      }),
    );

    const run: BenchmarkRunResult = {
      id: `benchmark-${Date.now()}`,
      datasetId: dataset.id,
      datasetName: dataset.name,
      cases,
      createdAt: new Date(),
    };

    this.runs.set(run.id, run);
    return run;
  }

  list(): BenchmarkRunResult[] {
    return Array.from(this.runs.values());
  }

  get(id: string): BenchmarkRunResult | undefined {
    return this.runs.get(id);
  }
}
