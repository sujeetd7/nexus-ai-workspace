export type HttpMethod =
  | "get"
  | "post"
  | "put"
  | "patch"
  | "delete"
  | "head"
  | "options";

export interface StableRoute {
  method: HttpMethod;
  path: string;
  operationId: string;
  public?: boolean;
}

export interface OpenApiDocument {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  servers?: Array<{ url: string; description?: string }>;
  tags?: Array<{ name: string; description?: string }>;
  paths: Record<string, Record<string, unknown>>;
  components?: Record<string, unknown>;
  security?: Array<Record<string, string[]>>;
}

export interface ServiceSpecConfig {
  service: string;
  title: string;
  version: string;
  description: string;
  /** Direct-service base URL (no trailing slash). */
  serverUrl: string;
  /** Mounted API prefix on the service, e.g. /api/v1/auth */
  apiPrefix: string;
  tags: Array<{ name: string; description?: string }>;
  stableRoutes: StableRoute[];
  paths: Record<string, Record<string, unknown>>;
  extraPaths?: Record<string, Record<string, unknown>>;
}

export interface GatewayRewrite {
  service: string;
  publicPrefix: string;
  rewritePrefix: string;
}

export interface AggregatedSpecResult {
  spec: OpenApiDocument;
  warnings: string[];
  serviceLinks: Array<{
    service: string;
    directJsonUrl: string;
    gatewayPaths: string[];
  }>;
}
