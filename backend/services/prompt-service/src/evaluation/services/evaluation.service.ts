import { BleuEvaluator } from "../evaluators/bleu.evaluator";
import { ContainsEvaluator } from "../evaluators/contains.evaluator";
import { ExactMatchEvaluator } from "../evaluators/exact-match.evaluator";
import { JsonValidatorEvaluator } from "../evaluators/json-validator.evaluator";
import { KeywordEvaluator } from "../evaluators/keyword.evaluator";
import { LlmJudgeEvaluator } from "../evaluators/llm-judge.evaluator";
import { RegexEvaluator } from "../evaluators/regex.evaluator";
import { RougeEvaluator } from "../evaluators/rouge.evaluator";
import { SemanticSimilarityEvaluator } from "../evaluators/semantic-similarity.evaluator";
import { EvaluatorRegistry } from "../registry/evaluator.registry";
import { EvaluationRepository } from "../repositories/evaluation.repository";
import { EvaluationRunner } from "../runner/evaluation-runner";

import { RunEvaluationDto } from "../dto/run-evaluation.dto";

export class EvaluationService {
  private readonly registry = new EvaluatorRegistry();

  private readonly runner = new EvaluationRunner();

  private readonly repository = new EvaluationRepository();

  constructor() {
    this.registry.register(new ContainsEvaluator());
    this.registry.register(new ExactMatchEvaluator());
    this.registry.register(new JsonValidatorEvaluator());
    this.registry.register(new KeywordEvaluator());
    this.registry.register(new RegexEvaluator());
    this.registry.register(new SemanticSimilarityEvaluator());
    this.registry.register(new LlmJudgeEvaluator());
    this.registry.register(new BleuEvaluator());
    this.registry.register(new RougeEvaluator());
  }

  async evaluate(request: RunEvaluationDto) {
    const evaluator = this.registry.get(request.evaluator);

    const results = [];

    for (const testCase of request.cases) {
      const result = await this.runner.run({
        evaluator,

        provider: request.provider,

        model: request.model,

        systemPrompt: request.systemPrompt,

        userPrompt: request.userPrompt,

        testCase,
      });

      results.push(result);
    }

    const totalCases = results.length;

    const passedCases = results.filter((r) => r.passed).length;

    const failedCases = totalCases - passedCases;

    const averageScore =
      totalCases === 0
        ? 0
        : results.reduce((sum, r) => sum + r.score, 0) / totalCases;

    const evaluation = await this.repository.create({
      promptVersionId: request.promptVersionId,

      datasetName: request.datasetName,

      evaluator: request.evaluator,

      score: averageScore,

      totalCases,

      passedCases,

      failedCases,
    });

    await this.repository.addResults(evaluation.id, results);

    return this.repository.findById(evaluation.id);
  }

  async history() {
    return this.repository.history();
  }

  async details(id: string) {
    return this.repository.findById(id);
  }

  async analytics() {
    const evaluations = await this.repository.history();

    if (!Array.isArray(evaluations) || evaluations.length === 0) {
      return {
        totalEvaluations: 0,
        averageScore: 0,
        passed: 0,
        failed: 0,
        successRate: 0,
      };
    }

    const totalEvaluations = evaluations.length;
    const averageScore =
      evaluations.reduce(
        (sum: number, item: { score: number }) => sum + item.score,
        0,
      ) / totalEvaluations;
    const passed = evaluations.filter(
      (item: { passedCases?: number; totalCases?: number }) => {
        if (
          typeof item.passedCases === "number" &&
          typeof item.totalCases === "number"
        ) {
          return item.passedCases === item.totalCases;
        }
        return false;
      },
    ).length;
    const failed = totalEvaluations - passed;

    return {
      totalEvaluations,
      averageScore,
      passed,
      failed,
      successRate: totalEvaluations === 0 ? 0 : passed / totalEvaluations,
    };
  }
}
