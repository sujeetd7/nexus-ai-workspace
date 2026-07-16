import { ExecuteAIDto } from "../dto/execute-ai.dto";
import { EmbedAIDto } from "../dto/embed-ai.dto";
import { StreamEventDto, StreamEventType } from "../dto/stream-event.dto";
import { ProviderRouter } from "../providers/provider-router";
import { ModelRegistry } from "../providers/model-registry";
import { UsageService } from "../usage/usage.service";

export interface LLMRequest {
  workspaceId?: string;
  userId?: string;
  provider?: string;
  model?: string;
  prompt?: string;
  messages?: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface LLMResponse {
  text: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  durationMs: number;
  provider: string;
  model: string;
  finishReason?: string;
  usage?: {
    estimatedCost: number;
  };
}

export class LLMService {
  private readonly providerRouter = new ProviderRouter();
  private readonly modelRegistry = new ModelRegistry();
  private readonly usageService = new UsageService();

  async generate(request: LLMRequest): Promise<LLMResponse> {
    const start = Date.now();
    
    // Select provider and model
    const provider = request.provider || this.modelRegistry.getDefaultProvider("chat");
    const model = request.model || this.modelRegistry.getDefaultModel(provider, "chat");
    
    // Get provider instance
    const providerInstance = this.providerRouter.getProvider(provider);
    
    // Execute request using existing interface
    const executeRequest: ExecuteAIDto = {
      workspaceId: request.workspaceId || "",
      userId: request.userId || "",
      provider,
      model,
      prompt: request.prompt || (request.messages ? this.messagesToPrompt(request.messages) : ""),
      temperature: request.temperature ?? 0.7,
      maxTokens: request.maxTokens ?? 1000,
    };

    const response = await providerInstance.execute(executeRequest);

    const durationMs = Date.now() - start;

    // Track usage
    const usage = await this.usageService.trackUsage({
      provider,
      model,
      promptTokens: response.promptTokens || 0,
      completionTokens: response.completionTokens || 0,
      totalTokens: response.totalTokens || 0,
      latency: durationMs,
      workspaceId: request.workspaceId,
      userId: request.userId,
    });

    return {
      text: response.text,
      promptTokens: response.promptTokens,
      completionTokens: response.completionTokens,
      totalTokens: response.totalTokens,
      durationMs: response.durationMs,
      provider: response.provider,
      model: response.model,
      usage: {
        estimatedCost: usage.estimatedCost,
      },
    };
  }

  async *stream(request: LLMRequest): AsyncGenerator<StreamEventDto> {
    const start = Date.now();
    
    // Select provider and model
    const provider = request.provider || this.modelRegistry.getDefaultProvider("chat");
    const model = request.model || this.modelRegistry.getDefaultModel(provider, "chat");
    
    // Get provider instance
    const providerInstance = this.providerRouter.getProvider(provider);
    
    let totalTokens = 0;
    let promptTokens = 0;
    let completionTokens = 0;

    // Execute streaming request using existing interface
    const executeRequest: ExecuteAIDto = {
      workspaceId: request.workspaceId || "",
      userId: request.userId || "",
      provider,
      model,
      prompt: request.prompt || (request.messages ? this.messagesToPrompt(request.messages) : ""),
      temperature: request.temperature ?? 0.7,
      maxTokens: request.maxTokens ?? 1000,
    };

    let isComplete = false;
    for await (const event of providerInstance.stream(executeRequest)) {
      yield event;

      if (event.type === StreamEventType.DONE) {
        const durationMs = Date.now() - start;
        
        // Extract token info from the done event
        if (event.data) {
          totalTokens = (event.data as any).totalTokens || 0;
          promptTokens = (event.data as any).promptTokens || 0;
          completionTokens = (event.data as any).completionTokens || 0;
        }

        // Track usage
        await this.usageService.trackUsage({
          provider,
          model,
          promptTokens,
          completionTokens,
          totalTokens,
          latency: durationMs,
          workspaceId: request.workspaceId,
          userId: request.userId,
        });

        isComplete = true;
        break;
      }
    }
  }

  async embeddings(request: {
    input: string | string[];
    provider?: string;
    model?: string;
    workspaceId?: string;
    userId?: string;
  }) {
    const start = Date.now();
    
    // Select provider and model for embeddings
    const provider = request.provider || this.modelRegistry.getDefaultProvider("embedding");
    const model = request.model || this.modelRegistry.getDefaultModel(provider, "embedding");
    
    // Get provider instance
    const providerInstance = this.providerRouter.getProvider(provider);
    
    // Execute embeddings request using existing interface
    const embedRequest: EmbedAIDto = {
      provider,
      model,
      input: Array.isArray(request.input) ? request.input : [request.input],
    };

    const response = await providerInstance.embed(embedRequest);

    const durationMs = Date.now() - start;

    // Track usage
    const usage = await this.usageService.trackUsage({
      provider,
      model,
      promptTokens: response.embeddings.length || 0,
      completionTokens: 0,
      totalTokens: response.embeddings.length || 0,
      latency: durationMs,
      workspaceId: request.workspaceId,
      userId: request.userId,
    });

    return {
      embeddings: response.embeddings,
      usage: {
        promptTokens: response.embeddings.length || 0,
        totalTokens: response.embeddings.length || 0,
        estimatedCost: usage.estimatedCost,
      },
      durationMs,
      provider,
      model,
    };
  }

  private messagesToPrompt(messages: Array<{role: "system" | "user" | "assistant"; content: string}>): string {
    return messages.map(msg => `${msg.role}: ${msg.content}`).join('\n');
  }
}