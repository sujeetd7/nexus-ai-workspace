import { ExecutionStatus } from "./execution-state";

export class ExecutionContext {
  public status = ExecutionStatus.Pending;

  public currentStep = "";

  public startedAt = Date.now();

  public finishedAt?: number;

  public retries = 0;

  public readonly variables = new Map<string, any>();

  public readonly outputs = new Map<string, any>();

  public readonly metadata = new Map<string, any>();

  setOutput(stepId: string, value: any): void {
    this.outputs.set(stepId, value);
  }

  getOutput(stepId: string): any {
    return this.outputs.get(stepId);
  }

  setVariable(name: string, value: any): void {
    this.variables.set(name, value);
  }

  getVariable(name: string): any {
    return this.variables.get(name);
  }

  complete(): void {
    this.status = ExecutionStatus.Completed;
    this.finishedAt = Date.now();
  }

  fail(): void {
    this.status = ExecutionStatus.Failed;
    this.finishedAt = Date.now();
  }
}
