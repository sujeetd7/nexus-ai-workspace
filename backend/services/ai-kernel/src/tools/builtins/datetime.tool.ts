import { ITool } from "../interfaces/tool.interface";

export class DateTimeTool implements ITool {
  readonly id = "datetime";

  readonly name = "datetime";

  readonly description = "Returns current date and time";

  readonly version = "1.0.0";

  readonly enabled = true;
  readonly category = "builtin";
  readonly permissions: string[] = [];
  readonly tags = ["datetime"];

  async execute() {
    const now = new Date();

    return {
      iso: now.toISOString(),
      timestamp: now.getTime(),
      utc: now.toUTCString(),
      locale: now.toLocaleString(),
    };
  }
}
