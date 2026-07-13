import { ToolTelemetryEvent } from "./tool-telemetry.interface";

export class ToolTelemetry {
  public onStart(tool: string, requestId: string): number {
    const startedAt = Date.now();

    console.log("[Tool Started]", {
      tool,
      requestId,
      startedAt,
    });

    return startedAt;
  }

  public onSuccess(tool: string, requestId: string, startedAt: number): void {
    const completedAt = Date.now();

    const event: ToolTelemetryEvent = {
      tool,
      requestId,
      startedAt,
      completedAt,
      duration: completedAt - startedAt,
      success: true,
    };

    console.log("[Tool Success]", event);
  }

  public onFailure(
    tool: string,
    requestId: string,
    startedAt: number,
    error: unknown,
  ): void {
    const completedAt = Date.now();

    const event: ToolTelemetryEvent = {
      tool,
      requestId,
      startedAt,
      completedAt,
      duration: completedAt - startedAt,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };

    console.error("[Tool Failure]", event);
  }
}
