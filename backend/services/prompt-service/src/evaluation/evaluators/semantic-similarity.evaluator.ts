import { EvaluationCase, EvaluationResult } from "../types/evaluation.types";
import { PromptEvaluator } from "./evaluator.interface";

export class SemanticSimilarityEvaluator implements PromptEvaluator {
  readonly name = "semantic-similarity";

  async evaluate(
    testCase: EvaluationCase,
    actual: string,
  ): Promise<EvaluationResult> {
    const expected = String(testCase.expected ?? "");

    if (!expected) {
      return {
        passed: false,
        score: 0,
        feedback: "No expected text provided.",
      };
    }

    const similarity = this.calculateSimilarity(expected, actual);
    const passed = similarity >= 0.8;

    return {
      passed,
      score: similarity,
      feedback: passed
        ? "Semantic similarity exceeded the threshold."
        : "Semantic similarity was below the threshold.",
    };
  }

  private calculateSimilarity(expected: string, actual: string): number {
    const a = expected.toLowerCase().split(/\W+/).filter(Boolean);
    const b = actual.toLowerCase().split(/\W+/).filter(Boolean);

    if (a.length === 0 || b.length === 0) {
      return 0;
    }

    const intersection = a.filter((token) => b.includes(token));
    const union = Array.from(new Set([...a, ...b]));

    return intersection.length / union.length;
  }
}
