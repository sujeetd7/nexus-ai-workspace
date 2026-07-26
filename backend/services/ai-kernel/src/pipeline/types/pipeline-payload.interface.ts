import { ExecutionResult } from "../../execution/engine/execution-result";
import { ExecutionPlan } from "../../planner/types/execution-plan.interface";

export interface PipelinePayload {
  request: any;

  context: any;

  memory?: any;

  retrievedDocuments?: any[];

  executionPlan?: ExecutionPlan;

  executionResult?: ExecutionResult;

  compiledPrompt?: string;

  providerConfig?: any;

  llmResponse?: any;

  parsedOutput?: any;

  toolOutput?: any;

  metadata?: Record<string, unknown>;
}
