import {
  ProviderExecuteRequest,
  ProviderExecuteResponse,
} from "../provider.interface";

export interface ILLMProvider {
  readonly name: string;

  execute(request: ProviderExecuteRequest): Promise<ProviderExecuteResponse>;
}
