import { ITool } from "../interfaces/tool.interface";

export class JsonTool implements ITool {
  readonly id = "json";

  readonly name = "json";

  readonly description = "JSON utility";

  readonly version = "1.0.0";

  readonly enabled = true;

  readonly category = "builtin";

  readonly permissions: string[] = [];

  readonly tags = ["json"];

  async execute(input: {
    action: "format" | "minify";
    value: any;
  }): Promise<string> {
    switch (input.action) {
      case "format":
        return JSON.stringify(input.value, null, 2);

      case "minify":
        return JSON.stringify(input.value);

      default:
        throw new Error("Unsupported JSON action");
    }
  }
}
