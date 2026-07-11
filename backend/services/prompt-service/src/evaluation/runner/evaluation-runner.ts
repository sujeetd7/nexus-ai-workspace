import { AIServiceClient } from "../../clients/ai-service.client";
import { PromptCompiler } from "../../compiler/prompt-compiler";

import { PromptEvaluator } from "../evaluators/evaluator.interface";
import { EvaluationCase } from "../types/evaluation.types";

export interface RunEvaluationRequest {
  evaluator: PromptEvaluator;

  provider: string;

  model?: string;

  systemPrompt: string;

  userPrompt: string;

  testCase: EvaluationCase;
}

export class EvaluationRunner {
  private readonly compiler = new PromptCompiler();

  private readonly aiClient = new AIServiceClient();

  async run(request: RunEvaluationRequest) {
    const systemPrompt = this.compiler.compile(
      request.systemPrompt,
      request.testCase.variables,
    );

    const userPrompt = this.compiler.compile(
      request.userPrompt,
      request.testCase.variables,
    );

    const response = await this.aiClient.execute({
      provider: request.provider,

      model: request.model,

      systemPrompt,

      prompt: userPrompt,
    });

    const result = await request.evaluator.evaluate(
      request.testCase,
      response.text,
    );

    return {
      input: request.testCase.variables,

      expected: request.testCase.expected,

      actual: response.text,

      passed: result.passed,

      score: result.score,

      feedback: result.feedback,

      latency: response.durationMs,

      tokens: response.totalTokens,

      provider: response.provider,

      model: response.model,
    };
  }
}
