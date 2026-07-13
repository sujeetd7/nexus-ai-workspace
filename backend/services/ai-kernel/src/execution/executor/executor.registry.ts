import { IExecutor, IExecutorRegistry } from "./executor-registry.interface";

/**
 * A concrete implementation of `IExecutorRegistry` that manages registered executors.
 */
export class ExecutorRegistry implements IExecutorRegistry {
  private executors: Map<string, IExecutor> = new Map();

  public getExecutor(action: string): IExecutor | undefined {
    return this.executors.get(action);
  }

  public registerExecutor(action: string, executor: IExecutor): void {
    if (this.executors.has(action)) {
      console.warn(`Executor for action '${action}' is being overwritten.`);
    }
    this.executors.set(action, executor);
    console.log(`Executor for action '${action}' registered.`);
  }
}
