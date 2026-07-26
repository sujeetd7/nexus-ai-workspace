import axios from "axios";
import { ITool } from "../interfaces/tool.interface";

export class HttpTool implements ITool {
  readonly id = "http";

  readonly name = "http";

  readonly description = "HTTP client";

  readonly version = "1.0.0";

  readonly enabled = true;
  readonly category = "builtin";

  readonly permissions: string[] = [];
  readonly tags = ["http", "network"];

  async execute(input: { method: "GET" | "POST"; url: string; body?: any }) {
    switch (input.method) {
      case "GET":
        return (await axios.get(input.url)).data;

      case "POST":
        return (await axios.post(input.url, input.body)).data;

      default:
        throw new Error("Unsupported HTTP method");
    }
  }
}
