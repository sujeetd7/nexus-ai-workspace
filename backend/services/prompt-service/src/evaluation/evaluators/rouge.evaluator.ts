import { EvaluationCase, EvaluationResult } from "../types/evaluation.types";
import { PromptEvaluator } from "./evaluator.interface";

export class RougeEvaluator implements PromptEvaluator {
  readonly name = "rouge";

  async evaluate(
    testCase: EvaluationCase,
    actual: string,
  ): Promise<EvaluationResult> {
    const expected = String(testCase.expected ?? "");

    if (!expected) {
      return {
        passed: false,
        score: 0,
        feedback: "No reference text provided.",
      };
    }

    const overlap = this.calculateOverlap(expected, actual);

    return {
      passed: overlap >= 0.5,
      score: overlap,
      feedback:
        overlap >= 0.5
          ? "ROUGE overlap threshold met."
          : "ROUGE overlap was low.",
    };
  }

  private calculateOverlap(expected: string, actual: string): number {
    const expectedTokens = expected.toLowerCase().split(/\W+/).filter(Boolean);
    const actualTokens = actual.toLowerCase().split(/\W+/).filter(Boolean);

    if (expectedTokens.length === 0 || actualTokens.length === 0) {
      return 0;
    }

    const overlap = expectedTokens.filter((token) =>
      actualTokens.includes(token),
    );
    return overlap.length / expectedTokens.length;
  }
}
