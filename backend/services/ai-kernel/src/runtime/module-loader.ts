import { ModuleRegistry } from "./module-registry";
import { RuntimeModule } from "./module.interface";

export class ModuleLoader {
  constructor(private readonly registry: ModuleRegistry) {}

  async initialize(): Promise<void> {
    const initialized: RuntimeModule[] = [];

    try {
      for (const module of this.registry.getAll()) {
        console.log(`Loading module: ${module.name}`);

        await module.initialize();

        initialized.push(module);
      }
    } catch (error) {
      console.error("Runtime initialization failed.");

      for (const module of initialized.reverse()) {
        try {
          await module.shutdown();
        } catch (shutdownError) {
          console.error(
            `Failed to shutdown module: ${module.name}`,
            shutdownError,
          );
        }
      }

      throw error;
    }
  }

  async shutdown(): Promise<void> {
    const modules = [...this.registry.getAll()].reverse();

    const errors: Error[] = [];

    for (const module of modules) {
      console.log(`Stopping module: ${module.name}`);

      try {
        await module.shutdown();
      } catch (error) {
        errors.push(error as Error);

        console.error(`Failed stopping module: ${module.name}`);
      }
    }

    if (errors.length) {
      throw new AggregateError(
        errors,
        "Runtime shutdown completed with errors.",
      );
    }
  }
}
