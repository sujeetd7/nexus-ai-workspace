export interface IExecutionMetadata {
  correlationId?: string; // For linking related executions across services
  traceId?: string; // For distributed tracing
  sessionId?: string; // For tying executions to a user session
  // Any other metadata relevant to the specific execution instance
}
import { IKernelExecutionRequest } from "src/kernel/execution-request.interface";
import { IAgent } from "../dto/agent.interface";
import { IUser } from "../dto/user.interface";
import { IWorkspace } from "../dto/workspace.interface";

export interface IKernelContext {
  requestId: string;
  // The original incoming request details
  request: IKernelExecutionRequest;

  // Enriched context properties
  workspace?: IWorkspace;
  user?: IUser;
  agent?: IAgent;
  conversationId?: string;
  executionMetadata: IExecutionMetadata;

  currentPlan: any | null;
  memory: any;
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
    toolOutputs?: Record<string, any>; // Add toolOutputs here for direct access
  };
  toolOutputs: Record<string, any>;
  tokensUsed?: number;
  latencyMs?: number;
  finishReason?: string;
}
