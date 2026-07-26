import { IKernelContext } from "../kernel/kernel-context.interface";

export interface IPipelineStage {
  readonly name: string;

  execute(context: IKernelContext, payload: any): Promise<any>;
}

export interface IKernelPipeline {
  execute(context: IKernelContext, payload: any): Promise<any>;

  addStage(stage: IPipelineStage): void;
}
