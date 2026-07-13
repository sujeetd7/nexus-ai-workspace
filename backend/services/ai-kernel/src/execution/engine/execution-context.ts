import { IKernelContext } from "../../kernel/kernel-context.interface";
import { IPlan } from "../../planner/planner-module.interface";

/**
 * Represents the context for a single step of execution within the AI Kernel.
 * It encapsulates the global kernel context, the specific execution plan for this step,
 * and any dynamic payload or state.
 */
export class ExecutionContext {
  public readonly kernelContext: IKernelContext;
  public readonly plan: IPlan;
  public readonly payload: any; // The input payload for the current execution step
  public readonly cancellationToken?: AbortSignal; // For future cancellation support
  public readonly startTime: number;
  public readonly requestId: string;
  public readonly traceId: string;
  private _state: Map<string, any> = new Map(); // Mutable state for the current execution step

  constructor(
    kernelContext: IKernelContext,
    plan: IPlan,
    payload: any,
    cancellationToken?: AbortSignal,
  ) {
    this.kernelContext = kernelContext;
    this.plan = plan;
    this.payload = payload;
    this.cancellationToken = cancellationToken;
    this.startTime = Date.now();
    this.requestId = kernelContext.requestId;
    this.traceId = kernelContext.traceId || kernelContext.requestId;
  }

  /**
   * Retrieves a value from the execution context's state.
   * @param key The key of the state item.
   * @returns The value associated with the key, or undefined if not found.
   */
  public getState<T>(key: string): T | undefined {
    return this._state.get(key) as T;
  }

  /**
   * Sets a value in the execution context's state.
   * @param key The key of the state item.
   * @param value The value to set.
   */
  public setState(key: string, value: any): void {
    this._state.set(key, value);
  }

  /**
   * Returns a copy of the current state.
   */
  public get currentState(): ReadonlyMap<string, any> {
    return new Map(this._state);
  }
}
