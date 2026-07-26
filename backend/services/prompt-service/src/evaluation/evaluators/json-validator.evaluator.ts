import { EvaluationCase, EvaluationResult } from "../types/evaluation.types";
import { PromptEvaluator } from "./evaluator.interface";

export class JsonValidatorEvaluator implements PromptEvaluator {
  readonly name = "json-validator";

  async evaluate(
    testCase: EvaluationCase,
    actual: string,
  ): Promise<EvaluationResult> {
    const expected = testCase.expected;
    const normalized = actual.trim();

    try {
      const parsed = JSON.parse(normalized);
      const matchesExpectation =
        typeof expected === "undefined"
          ? true
          : JSON.stringify(parsed) === JSON.stringify(expected);

      return {
        passed: matchesExpectation,
        score: matchesExpectation ? 1 : 0,
        feedback: matchesExpectation
          ? "Output is valid JSON."
          : "Output JSON did not match the expected value.",
      };
    } catch {
      return {
        passed: false,
        score: 0,
        feedback: "Output is not valid JSON.",
      };
    }
  }
}
