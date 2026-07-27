import type {
  GatewayRewrite,
  OpenApiDocument,
  ServiceSpecConfig,
  StableRoute,
} from "./types.js";
import {
  OPENAPI_VERSION,
  bearerSecurity,
  standardComponents,
} from "./conventions.js";

function rewritePath(
  path: string,
  rewrite: GatewayRewrite,
): string {
  if (!path.startsWith(rewrite.rewritePrefix)) {
    return path;
  }
  return `${rewrite.publicPrefix}${path.slice(rewrite.rewritePrefix.length)}`;
}

function prefixComponentName(service: string, name: string): string {
  const normalized = service.replace(/[^a-zA-Z0-9]/g, "_");
  return `${normalized}_${name}`;
}

function namespaceComponents(
  service: string,
  components: Record<string, unknown> | undefined,
  warnings: string[],
): Record<string, unknown> | undefined {
  if (!components) return undefined;

  const result: Record<string, unknown> = {};
  for (const [section, value] of Object.entries(components)) {
    if (section === "securitySchemes") {
      result.securitySchemes = {
        bearerAuth: (standardComponents() as any).securitySchemes.bearerAuth,
      };
      continue;
    }

    if (typeof value !== "object" || value === null) {
      result[section] = value;
      continue;
    }

    const mapped: Record<string, unknown> = {};
    for (const [name, schema] of Object.entries(
      value as Record<string, unknown>,
    )) {
      if (
        section === "schemas" &&
        ["ErrorResponse", "GatewayErrorResponse", "PaginationMeta"].includes(
          name,
        )
      ) {
        mapped[name] = schema;
        continue;
      }
      mapped[prefixComponentName(service, name)] = schema;
    }
    result[section] = mapped;
  }
  return result;
}

function rewriteRefs(
  value: unknown,
  service: string,
): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => rewriteRefs(item, service));
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const next: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(obj)) {
      if (
        key === "$ref" &&
        typeof child === "string" &&
        child.startsWith("#/components/")
      ) {
        const refName = child.split("/").pop() ?? child;
        if (
          ["ErrorResponse", "GatewayErrorResponse", "PaginationMeta"].includes(
            refName,
          )
        ) {
          next[key] = child;
        } else {
          next[key] = `#/components/${child.split("/")[2]}/${prefixComponentName(service, refName)}`;
        }
      } else {
        next[key] = rewriteRefs(child, service);
      }
    }
    return next;
  }
  return value;
}

export function buildServiceSpec(config: ServiceSpecConfig): OpenApiDocument {
  return {
    openapi: OPENAPI_VERSION,
    info: {
      title: config.title,
      version: config.version,
      description: config.description,
    },
    servers: [{ url: config.serverUrl, description: "Direct service access" }],
    tags: config.tags,
    paths: {
      ...config.paths,
      ...(config.extraPaths ?? {}),
    },
    components: standardComponents(),
    security: bearerSecurity(),
  };
}

export function rewriteServiceSpecForGateway(
  spec: OpenApiDocument,
  rewrite: GatewayRewrite,
): OpenApiDocument {
  const paths: Record<string, Record<string, unknown>> = {};
  for (const [path, methods] of Object.entries(spec.paths)) {
    const gatewayPath = rewritePath(path, rewrite);
    paths[gatewayPath] = rewriteRefs(methods, rewrite.service) as Record<
      string,
      unknown
    >;
  }

  return {
    ...spec,
    servers: [{ url: "http://localhost:3000", description: "API Gateway" }],
    paths,
  };
}

export function mergeOpenApiSpecs(
  entries: Array<{
    service: string;
    spec: OpenApiDocument;
    rewrite: GatewayRewrite;
  }>,
  gatewayInfo: OpenApiDocument["info"],
): { spec: OpenApiDocument; warnings: string[] } {
  const warnings: string[] = [];
  const mergedPaths: Record<string, Record<string, unknown>> = {};
  const mergedTags: NonNullable<OpenApiDocument["tags"]> = [];
  const mergedComponents: Record<string, Record<string, unknown>> = {
  ...(standardComponents() as Record<string, Record<string, unknown>>),
  };

  const operationIds = new Set<string>();

  for (const entry of entries) {
    const gatewaySpec = rewriteServiceSpecForGateway(entry.spec, entry.rewrite);

    for (const tag of gatewaySpec.tags ?? []) {
      if (!mergedTags.some((t) => t.name === tag.name)) {
        mergedTags.push(tag);
      }
    }

    const namespaced = namespaceComponents(
      entry.service,
      gatewaySpec.components,
      warnings,
    );
    if (namespaced) {
      for (const [section, value] of Object.entries(namespaced)) {
        mergedComponents[section] = {
          ...(mergedComponents[section] ?? {}),
          ...(value as Record<string, unknown>),
        };
      }
    }

    for (const [path, methods] of Object.entries(gatewaySpec.paths)) {
      if (mergedPaths[path]) {
        warnings.push(
          `Path collision at ${path} while merging ${entry.service}`,
        );
      }
      mergedPaths[path] = methods;

      for (const operation of Object.values(methods)) {
        const op = operation as { operationId?: string };
        if (op?.operationId) {
          if (operationIds.has(op.operationId)) {
            warnings.push(`Duplicate operationId: ${op.operationId}`);
          }
          operationIds.add(op.operationId);
        }
      }
    }
  }

  return {
    spec: {
      openapi: OPENAPI_VERSION,
      info: gatewayInfo,
      servers: [{ url: "http://localhost:3000", description: "API Gateway" }],
      tags: mergedTags,
      paths: mergedPaths,
      components: mergedComponents,
      security: bearerSecurity(),
    },
    warnings,
  };
}

export function collectOperationIds(
  spec: OpenApiDocument,
): string[] {
  const ids: string[] = [];
  for (const methods of Object.values(spec.paths)) {
    for (const operation of Object.values(methods)) {
      const op = operation as { operationId?: string };
      if (op?.operationId) ids.push(op.operationId);
    }
  }
  return ids;
}

export function assertUniqueOperationIds(spec: OpenApiDocument): string[] {
  const seen = new Set<string>();
  const duplicates: string[] = [];
  for (const id of collectOperationIds(spec)) {
    if (seen.has(id)) duplicates.push(id);
    seen.add(id);
  }
  return duplicates;
}

export function compareStableRoutes(
  mounted: StableRoute[],
  spec: OpenApiDocument,
): {
  undocumented: StableRoute[];
  orphanOperations: Array<{ method: string; path: string; operationId?: string }>;
} {
  const specKeys = new Set<string>();
  const specOps: Array<{
    method: string;
    path: string;
    operationId?: string;
  }> = [];

  for (const [path, methods] of Object.entries(spec.paths)) {
    for (const [method, operation] of Object.entries(methods)) {
      if (method === "parameters") continue;
      specKeys.add(`${method.toUpperCase()} ${path}`);
      specOps.push({
        method: method.toUpperCase(),
        path,
        operationId: (operation as { operationId?: string }).operationId,
      });
    }
  }

  const mountedKeys = new Set(
    mounted.map((r) => `${r.method.toUpperCase()} ${r.path}`),
  );

  const undocumented = mounted.filter(
    (r) => !specKeys.has(`${r.method.toUpperCase()} ${r.path}`),
  );

  const orphanOperations = specOps.filter(
    (op) => !mountedKeys.has(`${op.method} ${op.path}`),
  );

  return { undocumented, orphanOperations };
}

export function assertValidOpenApiDocument(spec: OpenApiDocument): string[] {
  const errors: string[] = [];
  if (!spec.openapi?.startsWith("3.0")) {
    errors.push("openapi version must be 3.0.x");
  }
  if (!spec.info?.title) errors.push("info.title is required");
  if (!spec.paths || typeof spec.paths !== "object") {
    errors.push("paths object is required");
  }
  const duplicates = assertUniqueOperationIds(spec);
  if (duplicates.length) {
    errors.push(`duplicate operationIds: ${duplicates.join(", ")}`);
  }
  return errors;
}
