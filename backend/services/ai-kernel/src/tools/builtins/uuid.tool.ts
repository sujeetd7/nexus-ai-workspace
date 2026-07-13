import { randomUUID } from "crypto";
import { ITool } from "../interfaces/tool.interface";

export class UUIDTool implements ITool {
  readonly id = "uuid";

  readonly name = "uuid";

  readonly description = "Generate UUID";

  readonly version = "1.0.0";

  readonly enabled = true;

  readonly category = "builtin";

  readonly permissions: string[] = [];

  readonly tags = ["uuid"];

  async execute() {
    return {
      uuid: randomUUID(),
    };
  }
}
