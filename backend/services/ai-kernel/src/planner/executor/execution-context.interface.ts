import { ExecutionPlan } from "../types/execution-plan.interface";

export interface ExecutionContext {
  plan: ExecutionPlan;

  kernelContext: any;

  payload: any;
}
