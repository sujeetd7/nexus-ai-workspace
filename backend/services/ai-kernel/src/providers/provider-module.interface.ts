import { IKernelModule } from "../kernel/kernel-module.interface";
import {
  ILLMProvider,
  ProviderExecuteRequest,
  ProviderExecuteResponse,
} from "./provider.interface";

export interface IProviderModule extends IKernelModule {
  getProvider(name: string): ILLMProvider;

  hasProvider(name: string): boolean;

  listProviders(): string[];

  execute(request: ProviderExecuteRequest): Promise<ProviderExecuteResponse>;
}
