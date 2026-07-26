import { IKernelContext } from "../kernel/kernel-context.interface";
import { IKernel } from "../kernel/kernel.interface";
import { IKernelPipeline, IPipelineStage } from "./pipeline.interface";

export class KernelPipeline implements IKernelPipeline {
  private stages: IPipelineStage[] = [];
  private kernelRef: IKernel | undefined;

  public addStage(stage: IPipelineStage): void {
    this.stages.push(stage);
  }

  public setKernel(kernel: IKernel): void {
    this.kernelRef = kernel;
  }

  public async execute(
    context: IKernelContext,
    initialPayload: any,
  ): Promise<any> {
    let currentPayload = initialPayload;
    const stages = [...this.stages];

    for (const stage of stages) {
      console.log(`Executing pipeline stage: ${stage.name}`);
      try {
        currentPayload = await stage.execute(context, currentPayload);
      } catch (error) {
        console.error(`Pipeline stage ${stage.name} failed`, error);
        throw error;
      }
    }
    return currentPayload;
  }
}
