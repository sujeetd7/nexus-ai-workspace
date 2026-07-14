import { ExecutionEngine } from "../execution/engine/execution-engine";
import { IExecutorRegistry } from "../execution/executor/executor-registry.interface";
import { ExecutorRegistry } from "../execution/executor/executor.registry";
import { LLMExecutor } from "../execution/executor/llm.executor";
import { IKernel, IKernelModule } from "../kernel/kernel-module.interface";
import { CalculatorTool } from "../tools/builtins/calculator.tool";
import { ToolRegistry } from "../tools/registry/tool-registry";
import { MemoryExecutor } from "./executor/memory.executor";
import { OutputExecutor } from "./executor/output.executor";
import { RagExecutor } from "./executor/rag.executor";
import { ToolExecutionExecutor } from "./executor/tool.executor";

export class ExecutionModule implements IKernelModule {
  public readonly name = "ExecutionModule";
  private executorRegistry: IExecutorRegistry;
  private executionEngine: ExecutionEngine | undefined;

  constructor() {
    this.executorRegistry = new ExecutorRegistry();
  }

  public async init(kernel: IKernel): Promise<void> {
    console.log("ExecutionModule initialized.");

    const toolRegistry = new ToolRegistry();

    // Register executors
    this.executorRegistry.registerExecutor("memory", new MemoryExecutor());

    toolRegistry.register(new CalculatorTool());

    this.executorRegistry.registerExecutor(
      "tool",
      new ToolExecutionExecutor(toolRegistry),
    );

    this.executorRegistry.registerExecutor("rag", new RagExecutor());

    this.executorRegistry.registerExecutor("llm", new LLMExecutor(kernel));

    this.executorRegistry.registerExecutor("output", new OutputExecutor());
    // Future: Register ToolExecutor, MemoryExecutor, etc.

    // Initialize the ExecutionEngine with the registry and a default scheduler
    this.executionEngine = new ExecutionEngine(this.executorRegistry);
  }

  public async dispose(): Promise<void> {
    console.log("ExecutionModule disposed.");
    // Clean up resources if necessary
  }

  public getExecutionEngine(): ExecutionEngine {
    if (!this.executionEngine) {
      throw new Error("ExecutionEngine not initialized. Call init() first.");
    }
    return this.executionEngine;
  }

  public getExecutorRegistry(): IExecutorRegistry {
    return this.executorRegistry;
  }
}
