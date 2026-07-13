import { ToolRegistry } from "../registry/tool-registry";
import { ToolTelemetry } from "./tool-telemetry";

export interface ToolExecutionRequest {
  tool: string;
  input: any;
  requestId: string;
}

export interface ToolExecutionResponse {
  success: boolean;
  data?: any;
  error?: string;
  duration: number;
}

export class ToolExecutor {
  private readonly telemetry = new ToolTelemetry();

  constructor(private readonly registry: ToolRegistry) {}

  public async execute(
    request: ToolExecutionRequest,
  ): Promise<ToolExecutionResponse> {
    const tool = this.registry.get(request.tool);

    if (!tool) {
      throw new Error(`Tool '${request.tool}' not found.`);
    }

    if (!tool.enabled) {
      throw new Error(`Tool '${request.tool}' is disabled.`);
    }

    const startedAt = this.telemetry.onStart(tool.name, request.requestId);

    try {
      const result = await tool.execute(request.input);

      this.telemetry.onSuccess(tool.name, request.requestId, startedAt);

      return {
        success: true,
        data: result,
        duration: Date.now() - startedAt,
      };
    } catch (error) {
      this.telemetry.onFailure(tool.name, request.requestId, startedAt, error);

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startedAt,
      };
    }
  }

  public async executeMany(
    requests: ToolExecutionRequest[],
  ): Promise<ToolExecutionResponse[]> {
    const responses: ToolExecutionResponse[] = [];

    for (const request of requests) {
      responses.push(await this.execute(request));
    }

    return responses;
  }
}
