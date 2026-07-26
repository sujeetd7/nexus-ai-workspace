import { RuntimeModule } from "./module.interface";

export class ModuleRegistry {
  private readonly modules = new Map<string, RuntimeModule>();

  register(module: RuntimeModule): void {
    if (this.modules.has(module.name)) {
      throw new Error(`Module '${module.name}' already registered.`);
    }

    this.modules.set(module.name, module);
  }

  get(name: string): RuntimeModule {
    const module = this.modules.get(name);

    if (!module) {
      throw new Error(`Module '${name}' not found.`);
    }

    return module;
  }

  getAll(): RuntimeModule[] {
    return [...this.modules.values()];
  }
}
