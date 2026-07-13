import { IKernelExecutionRequest } from "./execution-request.interface";
import { IKernelModule } from "./kernel-module.interface";

export interface IKernel {
  start(): Promise<void>;

  stop(): Promise<void>;

  execute(request: IKernelExecutionRequest): Promise<any>;

  registerModule(module: IKernelModule): void;

  getModule<T extends IKernelModule>(name: string): T;
}
