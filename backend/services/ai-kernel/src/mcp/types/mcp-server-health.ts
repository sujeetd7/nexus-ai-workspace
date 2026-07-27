export interface MCPServerHealth {
  status: "healthy" | "unhealthy" | "unknown";
  latency?: number;
  lastCheck: Date;
  error?: string;
  uptime?: number;
  version?: string;
}
