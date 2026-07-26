export interface ToolTelemetryEvent {
  tool: string;

  requestId: string;

  startedAt: number;

  completedAt: number;

  duration: number;

  success: boolean;

  error?: string;

  metadata?: Record<string, any>;
}
