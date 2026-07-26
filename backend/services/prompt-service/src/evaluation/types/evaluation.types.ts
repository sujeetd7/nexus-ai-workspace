export interface EvaluationCase {
  id: string;
  variables: Record<string, unknown>;
  expected?: unknown;
}

export interface EvaluationResult {
  passed: boolean;
  score: number;
  feedback?: string;
}

export interface EvaluationSummary {
  total: number;
  passed: number;
  failed: number;
  averageScore: number;
}
