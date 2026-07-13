import { IExecutor } from "../interfaces/executor.interface";

export class ExecutorRegistry {
  private readonly executors: IExecutor[] = [];

  register(executor: IExecutor): void {
    this.executors.push(executor);
  }

  get(type: string): IExecutor | undefined {
    return this.executors.find((e) => e.supports(type));
  }
}
