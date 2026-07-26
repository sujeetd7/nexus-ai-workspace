import { IKernel } from "../kernel/kernel.interface";

import { IKernelPipeline } from "./pipeline.interface";

import { KernelPipeline } from "./kernel-pipeline";

import { ContextLoaderStage } from "./stages/context-loader.stage";
import { MemoryLoaderStage } from "./stages/memory-loader.stage";
import { OutputParserStage } from "./stages/output-parser.stage";
import { PersistenceLayerStage } from "./stages/persistence-layer.stage";
import { PlannerExecutorStage } from "./stages/planner-executor.stage";
import { PromptCompilerStage } from "./stages/prompt-compiler.stage";

import { IKernelModule } from "../kernel/kernel-module.interface";
import { ExecutionEngineStage } from "./stages/execution-engine.stage";

export class PipelineModule implements IKernelModule {
  public readonly name = "PipelineModule";

  private readonly pipeline = new KernelPipeline();

  public async init(kernel: IKernel): Promise<void> {
    this.pipeline.addStage(new ContextLoaderStage());

    this.pipeline.addStage(new MemoryLoaderStage(kernel));

    this.pipeline.addStage(new PlannerExecutorStage(kernel));

    this.pipeline.addStage(new PromptCompilerStage(kernel));

    // this.pipeline.addStage(new ProviderRouterStage());

    // this.pipeline.addStage(new LLMCallStage(kernel));

    // this.pipeline.addStage(new ToolExecutorStage());
    this.pipeline.addStage(new ExecutionEngineStage(kernel));

    this.pipeline.addStage(new OutputParserStage());

    this.pipeline.addStage(new PersistenceLayerStage(kernel));
  }

  public async dispose(): Promise<void> {}

  public getPipeline(): IKernelPipeline {
    return this.pipeline;
  }
}
