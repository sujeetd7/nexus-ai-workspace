import { EvaluationCase, EvaluationResult } from "../types/evaluation.types";
import { PromptEvaluator } from "./evaluator.interface";

export class LlmJudgeEvaluator implements PromptEvaluator {
  readonly name = "llm-judge";

  async evaluate(
    testCase: EvaluationCase,
    actual: string,
  ): Promise<EvaluationResult> {
    const expected = String(testCase.expected ?? "");

    if (!expected) {
      return {
        passed: false,
        score: 0,
        feedback: "No judgment criteria provided.",
      };
    }

    const normalized = actual.toLowerCase();
    const criteria = expected.toLowerCase();
    const passed =
      normalized.includes(criteria) || criteria.includes(normalized);

    return {
      passed,
      score: passed ? 1 : 0,
      feedback: passed
        ? "LLM judge criteria were satisfied."
        : "LLM judge criteria were not satisfied.",
    };
  }
}
