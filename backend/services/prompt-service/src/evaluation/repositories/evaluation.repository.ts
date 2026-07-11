import { PrismaClient } from "../../generated/prisma";

const prisma = new PrismaClient();

export class EvaluationRepository {
  async create(data: {
    promptVersionId: string;
    datasetName: string;
    evaluator: string;
    score: number;
    totalCases: number;
    passedCases: number;
    failedCases: number;
  }) {
    return prisma.promptEvaluation.create({
      data,
    });
  }

  async addResults(
    evaluationId: string,
    results: {
      input: unknown;
      expected: unknown;
      actual: unknown;
      passed: boolean;
      score: number;
      feedback?: string;
      latency?: number;
      tokens?: number;
    }[],
  ) {
    return prisma.promptEvaluationResult.createMany({
      data: results.map((r) => ({
        evaluationId,
        input: r.input as any,
        expected: r.expected as any,
        actual: r.actual as any,
        passed: r.passed,
        score: r.score,
        feedback: r.feedback,
        latency: r.latency,
        tokens: r.tokens,
      })),
    });
  }

  async history() {
    return prisma.promptEvaluation.findMany({
      include: {
        results: true,
        promptVersion: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async findById(id: string) {
    return prisma.promptEvaluation.findUnique({
      where: { id },
      include: {
        results: true,
        promptVersion: true,
      },
    });
  }
}
