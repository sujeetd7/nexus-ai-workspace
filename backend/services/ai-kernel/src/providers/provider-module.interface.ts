import { IKernelModule } from "../kernel/kernel-module.interface";
import {
  ILLMProvider,
  ProviderExecuteRequest,
  ProviderExecuteResponse,
} from "./provider.interface";

export interface IProviderModule extends IKernelModule {
  registerProvider(name: string, provider: ILLMProvider): void;

  getProvider(name: string): ILLMProvider;

  execute(request: ProviderExecuteRequest): Promise<ProviderExecuteResponse>;
}
