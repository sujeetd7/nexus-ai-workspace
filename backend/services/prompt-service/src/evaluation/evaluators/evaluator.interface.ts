import { EvaluationCase, EvaluationResult } from "../types/evaluation.types";

export interface PromptEvaluator {
  readonly name: string;

  evaluate(testCase: EvaluationCase, actual: string): Promise<EvaluationResult>;
}
