import { EvaluationCase } from "../types/evaluation.types";

export interface RunEvaluationDto {
  promptVersionId: string;
  datasetName: string;
  evaluator: string;

  provider: string;
  model?: string;

  systemPrompt: string;
  userPrompt: string;

  cases: EvaluationCase[];
}
