import { EvaluationCase, EvaluationResult } from "../types/evaluation.types";

import { PromptEvaluator } from "./evaluator.interface";

export class ContainsEvaluator implements PromptEvaluator {
  readonly name = "contains";

  async evaluate(
    testCase: EvaluationCase,
    actual: string,
  ): Promise<EvaluationResult> {
    const expected = String(testCase.expected ?? "");

    const passed = actual.toLowerCase().includes(expected.toLowerCase());

    return {
      passed,
      score: passed ? 1 : 0,
      feedback: passed ? "Contains expected text." : "Expected text missing.",
    };
  }
}
