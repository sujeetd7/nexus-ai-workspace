import { EvaluationCase, EvaluationResult } from "../types/evaluation.types";
import { PromptEvaluator } from "./evaluator.interface";

export class KeywordEvaluator implements PromptEvaluator {
  readonly name = "keyword";

  async evaluate(
    testCase: EvaluationCase,
    actual: string,
  ): Promise<EvaluationResult> {
    const expected = String(testCase.expected ?? "");

    if (!expected) {
      return {
        passed: false,
        score: 0,
        feedback: "No keyword provided.",
      };
    }

    const keywords = expected
      .split(",")
      .map((keyword) => keyword.trim().toLowerCase())
      .filter(Boolean);

    const normalized = actual.toLowerCase();
    const matched = keywords.filter((keyword) => normalized.includes(keyword));
    const passed = matched.length === keywords.length;

    return {
      passed,
      score: passed ? 1 : 0,
      feedback: passed
        ? "All expected keywords were found."
        : "One or more expected keywords were missing.",
    };
  }
}
