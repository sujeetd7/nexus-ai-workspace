import { EvaluationCase, EvaluationResult } from "../types/evaluation.types";

import { PromptEvaluator } from "./evaluator.interface";

export class ExactMatchEvaluator implements PromptEvaluator {
  readonly name = "exact-match";

  async evaluate(
    testCase: EvaluationCase,
    actual: string,
  ): Promise<EvaluationResult> {
    const expected = String(testCase.expected ?? "");

    const passed = expected.trim() === actual.trim();

    return {
      passed,

      score: passed ? 1 : 0,

      feedback: passed ? "Exact match." : "Output differs.",
    };
  }
}
