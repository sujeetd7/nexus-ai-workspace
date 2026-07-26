import { IKernelContext } from "../../kernel/kernel-context.interface";

export interface ToolContext {
  kernelContext: IKernelContext;

  toolName: string;

  arguments: any;
}
