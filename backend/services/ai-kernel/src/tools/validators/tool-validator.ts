import { ITool } from "../interfaces/tool.interface";

export class ToolValidator {
  validate(tool: ITool): void {
    if (!tool.id) {
      throw new Error("Tool id is required");
    }

    if (!tool.name) {
      throw new Error("Tool name is required");
    }

    if (!tool.version) {
      throw new Error("Tool version is required");
    }

    if (typeof tool.execute !== "function") {
      throw new Error(`${tool.name} does not implement execute()`);
    }
  }
}
