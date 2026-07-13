import { ExecutionPlan } from "./execution-plan.interface";

export interface PipelinePayload {
  request: any;

  context: any;

  memory?: any;

  retrievedDocuments?: any[];

  executionPlan?: ExecutionPlan;

  compiledPrompt?: string;

  providerConfig?: any;

  llmResponse?: any;

  parsedOutput?: any;

  toolOutput?: any;

  metadata?: Record<string, unknown>;
}
