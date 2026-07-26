import { EvaluationCase, EvaluationResult } from "../types/evaluation.types";
import { PromptEvaluator } from "./evaluator.interface";

export class RegexEvaluator implements PromptEvaluator {
  readonly name = "regex";

  async evaluate(
    testCase: EvaluationCase,
    actual: string,
  ): Promise<EvaluationResult> {
    const expected = String(testCase.expected ?? "");

    if (!expected) {
      return {
        passed: false,
        score: 0,
        feedback: "No regex pattern provided.",
      };
    }

    try {
      const pattern = new RegExp(expected);
      const passed = pattern.test(actual);

      return {
        passed,
        score: passed ? 1 : 0,
        feedback: passed
          ? "Regex pattern matched."
          : "Regex pattern did not match.",
      };
    } catch {
      return {
        passed: false,
        score: 0,
        feedback: "Invalid regex pattern.",
      };
    }
  }
}
