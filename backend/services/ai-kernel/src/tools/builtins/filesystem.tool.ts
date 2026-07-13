import { promises as fs } from "fs";
import { ITool } from "../interfaces/tool.interface";

export class FileSystemTool implements ITool {
  readonly id = "filesystem";

  readonly name = "filesystem";

  readonly description = "Read or write files";

  readonly version = "1.0.0";

  readonly enabled = true;

  readonly category = "builtin";

  readonly permissions: string[] = [];

  readonly tags = ["filesystem"];

  async execute(input: {
    operation: "read" | "write";
    path: string;
    content?: string;
  }) {
    switch (input.operation) {
      case "read":
        return fs.readFile(input.path, "utf8");

      case "write":
        await fs.writeFile(input.path, input.content ?? "");

        return {
          success: true,
        };

      default:
        throw new Error("Unsupported filesystem operation");
    }
  }
}
