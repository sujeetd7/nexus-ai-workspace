import { ExecutionEngine } from "../execution/engine/execution-engine";
import { IExecutorRegistry } from "../execution/executor/executor-registry.interface";
import { ExecutorRegistry } from "../execution/executor/executor.registry";
import { LLMExecutor } from "../execution/executor/llm.executor";
import { IScheduler } from "../execution/scheduler/scheduler";
import { SequentialScheduler } from "../execution/scheduler/sequential.scheduler";
import { IKernel, IKernelModule } from "../kernel/kernel-module.interface";

export class ExecutionModule implements IKernelModule {
  public readonly name = "ExecutionModule";
  private executorRegistry: IExecutorRegistry;
  private executionEngine: ExecutionEngine | undefined;
  private defaultScheduler: IScheduler;

  constructor() {
    this.executorRegistry = new ExecutorRegistry();
    this.defaultScheduler = new SequentialScheduler(); // Default to sequential
  }

  public async init(kernel: IKernel): Promise<void> {
    console.log("ExecutionModule initialized.");

    // Register executors
    this.executorRegistry.registerExecutor("call_llm", new LLMExecutor(kernel));
    // Future: Register ToolExecutor, MemoryExecutor, etc.

    // Initialize the ExecutionEngine with the registry and a default scheduler
    this.executionEngine = new ExecutionEngine(
      this.defaultScheduler,
      this.executorRegistry,
    );
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

  public setDefaultScheduler(scheduler: IScheduler): void {
    this.defaultScheduler = scheduler;
    // If engine is already created, update it
    if (this.executionEngine) {
      this.executionEngine = new ExecutionEngine(
        this.defaultScheduler,
        this.executorRegistry,
      );
    }
  }
}
