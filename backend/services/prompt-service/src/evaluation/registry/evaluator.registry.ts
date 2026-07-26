import { PromptEvaluator } from "../evaluators/evaluator.interface";

export class EvaluatorRegistry {
  private readonly evaluators = new Map<string, PromptEvaluator>();

  register(evaluator: PromptEvaluator) {
    this.evaluators.set(evaluator.name, evaluator);
  }

  get(name: string) {
    const evaluator = this.evaluators.get(name);

    if (!evaluator) {
      throw new Error(`Evaluator '${name}' not registered.`);
    }

    return evaluator;
  }
}
