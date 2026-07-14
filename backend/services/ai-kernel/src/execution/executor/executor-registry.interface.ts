import type { IExecutionExecutor } from "./executor.interface";

export type { IExecutionExecutor } from "./executor.interface";

export interface IExecutorRegistry {
  /**
   * Returns executor for a given execution step type.
   */
  getExecutor(stepType: string): IExecutionExecutor | undefined;

  /**
   * Registers executor for a given execution step type.
   */
  registerExecutor(stepType: string, executor: IExecutionExecutor): void;

  /**
   * Returns true if executor exists.
   */
  hasExecutor(stepType: string): boolean;

  /**
   * Returns all registered executor names.
   */
  listExecutors(): string[];
}
