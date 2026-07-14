import { Kernel } from "./kernel";
import { IKernelLifecycle } from "./kernel-lifecycle.interface";
import { IKernelModule } from "./kernel-module.interface";
import { IKernelOptions } from "./kernel-options.interface";
import { IKernelRegistry } from "./kernel-registry.interface";

export class KernelBuilder {
  private options: IKernelOptions = {};
  private registry: IKernelRegistry = {
    providers: new Map(),
    tools: new Map(),
    memories: new Map(),
    planners: new Map(),
    prompts: new Map(),
    pipelines: new Map(),
  };
  private lifecycle: IKernelLifecycle = {
    onStart: async (kernel) => console.log("Kernel lifecycle: onStart"),
    onStop: async (kernel) => console.log("Kernel lifecycle: onStop"),
  };
  private modules: IKernelModule[] = [];

  public setOptions(options: IKernelOptions): KernelBuilder {
    this.options = { ...this.options, ...options };
    return this;
  }

  public setRegistry(registry: IKernelRegistry): KernelBuilder {
    this.registry = registry;
    return this;
  }

  public setLifecycle(lifecycle: IKernelLifecycle): KernelBuilder {
    this.lifecycle = lifecycle;
    return this;
  }

  public addModule(module: IKernelModule): KernelBuilder {
    const exists = this.modules.some((m) => m.name === module.name);

    if (exists) {
      throw new Error(`Module '${module.name}' already registered.`);
    }

    this.modules.push(module);

    return this;
  }

  public build(): Kernel {
    const requiredModules = ["PipelineModule", "ExecutionModule"];

    for (const moduleName of requiredModules) {
      if (!this.modules.some((module) => module.name === moduleName)) {
        throw new Error(`${moduleName} is required.`);
      }
    }
    const kernel = new Kernel(this.registry, this.lifecycle, this.options);

    for (const module of this.modules) {
      kernel.registerModule(module);
    }

    return kernel;
  }
}
