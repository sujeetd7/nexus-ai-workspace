import { EvaluationCase, EvaluationResult } from "../types/evaluation.types";
import { PromptEvaluator } from "./evaluator.interface";

export class BleuEvaluator implements PromptEvaluator {
  readonly name = "bleu";

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
    const score = Math.max(0, Math.min(1, overlap));

    return {
      passed: score >= 0.5,
      score,
      feedback:
        score >= 0.5 ? "BLEU overlap threshold met." : "BLEU overlap was low.",
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
