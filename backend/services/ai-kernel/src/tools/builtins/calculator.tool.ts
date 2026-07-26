import { ITool } from "../interfaces/tool.interface";

export class CalculatorTool implements ITool {
  readonly id = "calculator";

  readonly name = "Calculator";

  readonly description = "Math calculator";

  readonly version = "1.0.0";

  readonly category = "builtin";

  readonly enabled = true;

  readonly permissions: string[] = [];

  readonly tags = ["math"];

  readonly inputSchema = {
    type: "object",

    properties: {
      operation: {
        type: "string",

        enum: ["add", "subtract", "multiply", "divide"],
      },

      a: {
        type: "number",
      },

      b: {
        type: "number",
      },
    },

    required: ["operation", "a", "b"],
  };

  async execute(input: {
    operation: "add" | "subtract" | "multiply" | "divide";
    a: number;
    b: number;
  }): Promise<number> {
    switch (input.operation) {
      case "add":
        return input.a + input.b;

      case "subtract":
        return input.a - input.b;

      case "multiply":
        return input.a * input.b;

      case "divide":
        if (input.b === 0) {
          throw new Error("Division by zero");
        }

        return input.a / input.b;

      default:
        throw new Error("Unsupported operation");
    }
  }
}
