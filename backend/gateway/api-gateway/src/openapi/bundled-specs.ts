import path from "path";
import { createRequire } from "module";

import type { OpenApiDocument } from "@nexus/openapi";

const nodeRequire = createRequire(__filename);
const repoRoot = path.resolve(__dirname, "../../../../..");

function loadServiceSpec(serviceDir: string): OpenApiDocument {
  const specPath = path.join(
    repoRoot,
    "backend",
    "services",
    serviceDir,
    "dist",
    "openapi",
    "spec.js",
  );
  const loaded = nodeRequire(specPath) as Record<string, OpenApiDocument>;
  const key = Object.keys(loaded).find((k) => k.endsWith("OpenApiSpec"));
  if (!key) {
    throw new Error(`No OpenAPI export found in ${specPath}`);
  }
  return loaded[key];
}

export interface BundledServiceSpec {
  service: string;
  spec: OpenApiDocument;
  directUrl: string;
}

export function loadBundledServiceSpecs(): BundledServiceSpec[] {
  return [
    {
      service: "auth",
      spec: loadServiceSpec("auth-service"),
      directUrl: "http://localhost:3001",
    },
    {
      service: "users",
      spec: loadServiceSpec("user-service"),
      directUrl: "http://localhost:3003",
    },
    {
      service: "workspaces",
      spec: loadServiceSpec("workspace-service"),
      directUrl: "http://localhost:3002",
    },
    {
      service: "documents",
      spec: loadServiceSpec("document-service"),
      directUrl: "http://localhost:3004",
    },
    {
      service: "prompts",
      spec: loadServiceSpec("prompt-service"),
      directUrl: "http://localhost:3005",
    },
    {
      service: "chat",
      spec: loadServiceSpec("chat-service"),
      directUrl: "http://localhost:3006",
    },
    {
      service: "ai",
      spec: loadServiceSpec("ai-service"),
      directUrl: "http://localhost:3007",
    },
    {
      service: "agents",
      spec: loadServiceSpec("agent-service"),
      directUrl: "http://localhost:3008",
    },
    {
      service: "kernel",
      spec: loadServiceSpec("ai-kernel"),
      directUrl: "http://localhost:3010",
    },
  ];
}
