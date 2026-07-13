export { IExecutor } from "./executor.interface";

import { IExecutor } from "./executor.interface";

export interface IExecutorRegistry {
  getExecutor(action: string): IExecutor | undefined;
  registerExecutor(action: string, executor: IExecutor): void;
}
