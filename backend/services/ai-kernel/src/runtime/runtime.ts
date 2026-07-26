import { ModuleLoader } from "./module-loader";
import { ModuleRegistry } from "./module-registry";

export class Runtime {
  readonly registry = new ModuleRegistry();

  readonly loader = new ModuleLoader(this.registry);

  private started = false;

  async start() {
    if (this.started) {
      return;
    }

    console.log("Starting AI Kernel Runtime...");

    await this.loader.initialize();

    this.started = true;

    console.log("Runtime Ready.");
  }

  async stop() {
    if (!this.started) {
      return;
    }

    console.log("Stopping AI Kernel Runtime...");

    await this.loader.shutdown();

    this.started = false;

    console.log("Runtime Stopped.");
  }
}
