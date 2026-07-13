import { IExecutor } from "../interfaces/executor.interface";

export class ExecutorRegistry {
  private readonly executors: IExecutor[] = [];

  register(executor: IExecutor) {
    this.executors.push(executor);
  }

  get(type: string) {
    return this.executors.find((e) => e.supports(type));
  }
}
