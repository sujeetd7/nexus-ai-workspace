import fp from "fastify-plugin";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";

import { mergeOpenApiSpecs } from "@nexus/openapi";
import type { OpenApiDocument } from "@nexus/openapi";
import { ROUTE_MAP } from "./create-proxy.js";
import { gatewayOpenApiSpec } from "../openapi/gateway-spec.js";
import { loadBundledServiceSpecs } from "../openapi/bundled-specs.js";

export interface DocsPluginOptions {
  /** When true, attempt live fetch from service /docs/json endpoints. */
  fetchLiveSpecs?: boolean;
}

async function fetchLiveSpec(url: string): Promise<OpenApiDocument | null> {
  try {
    const response = await fetch(`${url.replace(/\/$/, "")}/docs/json`, {
      signal: AbortSignal.timeout(1500),
    });
    if (!response.ok) return null;
    return (await response.json()) as OpenApiDocument;
  } catch {
    return null;
  }
}

export default fp<DocsPluginOptions>(async (fastify, options) => {
  const bundled = loadBundledServiceSpecs();
  const warnings: string[] = [];
  const serviceLinks: Array<{
    service: string;
    directJsonUrl: string;
    gatewayPaths: string[];
    source: "bundled" | "live";
  }> = [];

  const entries: Array<{
    service: string;
    spec: OpenApiDocument;
    rewrite: { service: string; publicPrefix: string; rewritePrefix: string };
  }> = [];

  for (const route of ROUTE_MAP) {
    const bundledEntry = bundled.find((b) => b.service === route.service);
    let spec = bundledEntry?.spec;
    let source: "bundled" | "live" = "bundled";

    if (options.fetchLiveSpecs) {
      const envKey = route.upstreamEnv as keyof typeof process.env;
      const upstream = process.env[envKey];
      if (upstream) {
        const live = await fetchLiveSpec(upstream);
        if (live) {
          spec = live;
          source = "live";
        } else {
          warnings.push(`Live spec unavailable for ${route.service}; using bundled copy`);
        }
      }
    }

    if (!spec) {
      warnings.push(`Missing bundled spec for ${route.service}`);
      continue;
    }

    entries.push({
      service: route.service,
      spec,
      rewrite: {
        service: route.service,
        publicPrefix: route.publicPrefix,
        rewritePrefix: route.rewritePrefix,
      },
    });

    const envKey = route.upstreamEnv as keyof typeof process.env;
    const upstream = process.env[envKey] ?? bundledEntry?.directUrl ?? "";
    serviceLinks.push({
      service: route.service,
      directJsonUrl: `${upstream.replace(/\/$/, "")}/docs/json`,
      gatewayPaths: Object.keys(spec.paths).map((path) => {
        if (route.rewritePrefix === route.publicPrefix) return path;
        if (path.startsWith(route.rewritePrefix)) {
          return `${route.publicPrefix}${path.slice(route.rewritePrefix.length)}`;
        }
        return path;
      }),
      source,
    });
  }

  const merged = mergeOpenApiSpecs(entries, gatewayOpenApiSpec.info);
  const aggregated: OpenApiDocument = {
    ...merged.spec,
    paths: {
      ...gatewayOpenApiSpec.paths,
      ...merged.spec.paths,
    },
    tags: [...(gatewayOpenApiSpec.tags ?? []), ...(merged.spec.tags ?? [])],
  };

  warnings.push(...merged.warnings);

  await fastify.register(swagger, {
    openapi: aggregated as any,
  });

  await fastify.register(swaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: true,
      persistAuthorization: true,
    },
  });

  fastify.get("/docs/services", async () => ({
    gateway: {
      ui: "/docs",
      json: "/docs/json",
    },
    services: serviceLinks,
    warnings,
    deferred: ["admin", "analytics", "notification"],
  }));
}, { name: "swagger-docs" });
