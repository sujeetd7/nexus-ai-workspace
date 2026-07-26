import {
  IExecutionExecutor,
  IExecutorRegistry,
} from "./executor-registry.interface";

export class ExecutorRegistry implements IExecutorRegistry {
  private readonly executors = new Map<string, IExecutionExecutor>();

  public registerExecutor(
    stepType: string,
    executor: IExecutionExecutor,
  ): void {
    this.executors.set(stepType, executor);

    console.log(`[ExecutorRegistry] Registered '${stepType}' executor`);
  }

  public getExecutor(stepType: string): IExecutionExecutor | undefined {
    return this.executors.get(stepType);
  }

  public hasExecutor(stepType: string): boolean {
    return this.executors.has(stepType);
  }

  public listExecutors(): string[] {
    return [...this.executors.keys()];
  }
}
