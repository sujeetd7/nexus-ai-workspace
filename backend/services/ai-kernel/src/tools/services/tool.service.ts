import { ToolRegistry } from "../registry/tool-registry";

export class ToolService {
  constructor(private readonly registry: ToolRegistry) {}

  async execute(name: string, input: any) {
    const tool = this.registry.get(name);

    if (!tool) {
      throw new Error(`Tool ${name} not found`);
    }

    return tool.execute(input);
  }
}
