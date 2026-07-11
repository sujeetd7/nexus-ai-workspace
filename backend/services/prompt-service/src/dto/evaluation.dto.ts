export interface EvaluationCase {
  input: Record<string, unknown>;

  expected?: unknown;
}

export interface RunEvaluationDto {
  promptVersionId: string;

  evaluator: string;

  datasetName: string;

  cases: EvaluationCase[];
}
