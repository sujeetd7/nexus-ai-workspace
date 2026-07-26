import { PipelineModule } from "../pipeline/pipeline.module";
import { IKernelExecutionRequest } from "./execution-request.interface";
import { IKernelContext } from "./kernel-context.interface";
import { IKernelLifecycle } from "./kernel-lifecycle.interface";
import { IKernelModule } from "./kernel-module.interface";
import { IKernelOptions } from "./kernel-options.interface";
import { IKernelRegistry } from "./kernel-registry.interface";
import { IKernel } from "./kernel.interface";

import { randomUUID } from "crypto";

export class Kernel implements IKernel {
  private modules: Map<string, IKernelModule> = new Map();

  constructor(
    private registry: IKernelRegistry,
    private lifecycle: IKernelLifecycle,
    private options: IKernelOptions,
  ) {}

  public async start(): Promise<void> {
    console.log("AI Kernel starting...");
    const initialized: IKernelModule[] = [];

    try {
      for (const module of this.modules.values()) {
        await module.init(this);
        initialized.push(module);
      }

      await this.lifecycle.onStart(this);

      console.log("AI Kernel started.");
    } catch (error) {
      for (const module of initialized.reverse()) {
        await module.dispose();
      }

      throw error;
    }
  }

  public async stop(): Promise<void> {
    console.log("AI Kernel stopping...");
    await this.lifecycle.onStop(this);
    for (const module of this.modules.values()) {
      await module.dispose();
    }
    console.log("AI Kernel stopped.");
  }

  public async execute(request: IKernelExecutionRequest): Promise<any> {
    const pipelineModule = this.getModule<PipelineModule>("PipelineModule");
    const pipeline = pipelineModule.getPipeline();

    const initialContext: IKernelContext = {
      requestId: request.requestId ?? randomUUID(),
      prompt: request.prompt,
      userId: request.userId,
      workspaceId: request.workspaceId,
      agentId: request.agentId,
      conversationId: request.conversationId,
      metadata: request.metadata || {},
      traceId: undefined,
      currentPlan: null,
      memory: {
        shortTermMemory: {},
        longTermMemory: {},
        conversationHistory: [],
      },
      retrievedDocuments: [],
      provider: null,
      compiledPrompt: "",
      toolOutputs: {},
    };

    try {
      const resultContext = await pipeline.execute(initialContext, {
        request,
        context: initialContext,
      });

      return {
        status: resultContext.parsedOutput.success ? "success" : "failed",

        output: resultContext.parsedOutput.output,

        tokens: resultContext.parsedOutput.tokens,

        latency: resultContext.parsedOutput.latencyMs,

        executionId: initialContext.requestId,

        toolOutputs: resultContext.parsedOutput.toolCalls,

        finishReason: resultContext.parsedOutput.finishReason,

        providerMetadata: resultContext.parsedOutput.providerMetadata,
      };
    } catch (error) {
      console.error("Error occurred while executing kernel:", error);
      throw error;
    }
  }

  public registerModule(module: IKernelModule): void {
    if (this.modules.has(module.name)) {
      throw new Error(`Module with name ${module.name} already registered.`);
    }
    this.modules.set(module.name, module);
  }

  public getModule<T extends IKernelModule>(name: string): T {
    const module = this.modules.get(name);
    if (!module) {
      throw new Error(`Module with name ${name} not found.`);
    }
    return module as T;
  }
}
