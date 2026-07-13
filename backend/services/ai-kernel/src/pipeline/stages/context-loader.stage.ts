import { randomUUID } from "crypto";
import { IKernelContext } from "../../kernel/kernel-context.interface";
import { IPipelineStage } from "../pipeline.interface";
import { PipelinePayload } from "../types/pipeline-payload.interface";

export class ContextLoaderStage implements IPipelineStage {
  public readonly name = "ContextLoaderStage";

  public async execute(
    context: IKernelContext,
    payload: PipelinePayload,
  ): Promise<PipelinePayload> {
    console.log(`[${this.name}] Loading context...`);
    const request = payload.request ?? context.request;
    const newContext: IKernelContext = {
      ...context,
      request,
      requestId: context.requestId || randomUUID(),
    };
    console.log(`[${this.name}] Context loaded:`, newContext);
    return {
      ...payload,
      request,
      context: newContext,
    };
  }
}
