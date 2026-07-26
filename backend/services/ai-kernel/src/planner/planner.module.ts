import { IKernelModule } from "../kernel/kernel-module.interface";
import { IKernel } from "../kernel/kernel.interface";
import { PlannerService } from "./planner.service";

export class PlannerModule implements IKernelModule {
  readonly name = "PlannerModule";

  private readonly planner = new PlannerService();

  async init(kernel: IKernel): Promise<void> {
    console.log("PlannerModule initialized");
  }

  async dispose(): Promise<void> {}

  getPlanner() {
    return this.planner;
  }
}
