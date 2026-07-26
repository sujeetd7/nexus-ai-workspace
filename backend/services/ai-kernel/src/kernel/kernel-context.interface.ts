import { IKernelExecutionRequest } from "./execution-request.interface";

export interface IKernelContext {
  requestId: string;
  prompt: string;
  request?: IKernelExecutionRequest;
  userId?: string;
  workspaceId?: string;
  agentId?: string;
  conversationId?: string;
  metadata: Record<string, unknown>;
  traceId?: string;

  // Properties enriched by pipeline stages
  currentPlan: any | null;

  memory: IMemory; // Use the structured IMemory interface
  retrievedDocuments: any[];
  provider: any | null;
  compiledPrompt: string;
  llmOutput?: string;
  parsedOutput?: {
    text: string;
    json?: any;
    usage?: any;
    finishReason?: string;
    cost?: number;
    citations?: any[];

    toolOutputs?: Record<string, any>;
  };
  toolOutputs: Record<string, any>;
  tokensUsed?: number;
  latencyMs?: number;
  finishReason?: string;
}

export interface IMemory {
  shortTermMemory: Record<string, any>;
  longTermMemory: Record<string, any>;
  conversationHistory: { role: string; content: string }[];
  // Other memory types can be added here, e.g., longTermMemory: any;
}
