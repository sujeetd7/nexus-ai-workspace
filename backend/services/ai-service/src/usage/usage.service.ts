import { ModelRegistry } from "../providers/model-registry";

export interface UsageData {
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latency: number;
  workspaceId?: string;
  userId?: string;
}

export interface UsageResult {
  estimatedCost: number;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latency: number;
  timestamp: Date;
}

export class UsageService {
  private readonly modelRegistry = new ModelRegistry();

  async trackUsage(data: UsageData): Promise<UsageResult> {
    const timestamp = new Date();
    const estimatedCost = this.calculateCost(data);

    // Log usage for monitoring/analytics
    console.log(
      `[USAGE] ${data.provider}/${data.model} - ${data.totalTokens} tokens - $${estimatedCost.toFixed(6)} - ${data.latency}ms`,
      {
        provider: data.provider,
        model: data.model,
        promptTokens: data.promptTokens,
        completionTokens: data.completionTokens,
        totalTokens: data.totalTokens,
        latency: data.latency,
        estimatedCost,
        workspaceId: data.workspaceId,
        userId: data.userId,
        timestamp: timestamp.toISOString(),
      },
    );

    // TODO: Store in database for billing/analytics
    // await this.storeUsageRecord(data, estimatedCost, timestamp);

    return {
      estimatedCost,
      provider: data.provider,
      model: data.model,
      promptTokens: data.promptTokens,
      completionTokens: data.completionTokens,
      totalTokens: data.totalTokens,
      latency: data.latency,
      timestamp,
    };
  }

  private calculateCost(data: UsageData): number {
    const modelConfig = this.modelRegistry.getModelConfig(data.model);

    if (!modelConfig || !modelConfig.costPer1kTokens) {
      return 0; // Free model or unknown cost
    }

    const inputCost =
      (data.promptTokens / 1000) * modelConfig.costPer1kTokens.input;
    const outputCost =
      (data.completionTokens / 1000) * modelConfig.costPer1kTokens.output;

    return inputCost + outputCost;
  }

  async getUsageStats(
    workspaceId?: string,
    userId?: string,
    timeframe?: {
      start: Date;
      end: Date;
    },
  ): Promise<{
    totalCost: number;
    totalTokens: number;
    totalRequests: number;
    averageLatency: number;
    costByProvider: Record<string, number>;
    tokensByProvider: Record<string, number>;
  }> {
    // TODO: Implement database queries for usage analytics
    // This would query stored usage records with filters

    // Placeholder return for now
    return {
      totalCost: 0,
      totalTokens: 0,
      totalRequests: 0,
      averageLatency: 0,
      costByProvider: {},
      tokensByProvider: {},
    };
  }

  async getTopModels(
    workspaceId?: string,
    limit: number = 10,
  ): Promise<
    Array<{
      provider: string;
      model: string;
      totalTokens: number;
      totalCost: number;
      requestCount: number;
      averageLatency: number;
    }>
  > {
    // TODO: Implement database queries for top models analytics

    // Placeholder return for now
    return [];
  }

  async getCostProjection(
    workspaceId?: string,
    projectionDays: number = 30,
  ): Promise<{
    projectedMonthlyCost: number;
    currentDailyCost: number;
    projectedTokenUsage: number;
  }> {
    // TODO: Implement cost projection based on historical usage

    // Placeholder return for now
    return {
      projectedMonthlyCost: 0,
      currentDailyCost: 0,
      projectedTokenUsage: 0,
    };
  }

  // Private method for future database storage
  // private async storeUsageRecord(data: UsageData, cost: number, timestamp: Date): Promise<void> {
  //   // TODO: Store usage record in database
  //   // This could use Prisma to store in a usage_logs table
  // }
}
