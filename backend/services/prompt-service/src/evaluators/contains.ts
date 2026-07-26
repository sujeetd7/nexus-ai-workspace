export class ContainsEvaluator {
  evaluate(expected: string, actual: string) {
    const passed = actual.toLowerCase().includes(expected.toLowerCase());

    return {
      passed,

      score: passed ? 1 : 0,

      feedback: passed ? "Matched" : "Expected text not found",
    };
  }
}
