import { ITool } from "../interfaces/tool.interface";

export class ToolRegistry {
  private readonly tools = new Map<string, ITool>();

  register(tool: ITool) {
    this.tools.set(tool.name, tool);
  }

  get(name: string) {
    return this.tools.get(name);
  }

  getAll() {
    return [...this.tools.values()];
  }

  public exists(name: string) {
    return this.tools.has(name);
  }

  public unregister(name: string) {
    this.tools.delete(name);
  }

  public metadata() {
    return [...this.tools.values()].map((tool) => ({
      id: tool.id,

      name: tool.name,

      version: tool.version,

      category: tool.category,

      enabled: tool.enabled,

      description: tool.description,

      tags: tool.tags ?? [],
    }));
  }

  public definitions() {
    return this.getAll().map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema ?? {
          type: "object",
          properties: {},
        },
      },
    }));
  }
}
