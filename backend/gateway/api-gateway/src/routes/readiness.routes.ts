import { UPSTREAM_SERVICES } from "../config/env";

export interface UpstreamReadiness {
  name: string;
  configured: boolean;
  reachable: boolean;
  status: "ready" | "unavailable" | "unconfigured";
  httpStatus?: number;
  latencyMs?: number;
  error?: string;
  checkedAt: string;
}

function sanitizeProbeUrl(baseUrl: string, healthPath: string): string {
  const base = baseUrl.replace(/\/$/, "");
  const path = healthPath.startsWith("/") ? healthPath : `/${healthPath}`;
  return `${base}${path}`;
}

async function probeUpstream(
  name: string,
  baseUrl: string,
  healthPath: string,
): Promise<UpstreamReadiness> {
  const checkedAt = new Date().toISOString();
  const configured = Boolean(baseUrl && baseUrl.trim().length > 0);

  if (!configured) {
    return {
      name,
      configured: false,
      reachable: false,
      status: "unconfigured",
      error: "upstream URL not configured",
      checkedAt,
    };
  }

  const target = sanitizeProbeUrl(baseUrl, healthPath);
  const started = Date.now();

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(target, {
      method: "GET",
      signal: controller.signal,
      headers: { accept: "application/json" },
    });

    clearTimeout(timer);

    // Any HTTP response means the process is reachable (even 401/404).
    return {
      name,
      configured: true,
      reachable: true,
      status: "ready",
      httpStatus: response.status,
      latencyMs: Date.now() - started,
      checkedAt,
    };
  } catch (err: any) {
    const reason =
      err?.name === "AbortError"
        ? "probe_timeout"
        : err?.cause?.code === "ECONNREFUSED" || err?.code === "ECONNREFUSED"
          ? "connection_refused"
          : err?.cause?.code === "ENOTFOUND" || err?.code === "ENOTFOUND"
            ? "dns_failure"
            : "unreachable";

    return {
      name,
      configured: true,
      reachable: false,
      status: "unavailable",
      latencyMs: Date.now() - started,
      error: reason,
      checkedAt,
    };
  }
}

/**
 * GET /readiness — required product upstream readiness.
 *
 * Policy:
 * - 200 when every mandatory implemented upstream is reachable
 * - 503 when any mandatory upstream is unconfigured or unreachable
 *
 * Admin / Analytics / Notification are deferred and are NOT probed.
 */
export async function readinessRoutes(fastify: any): Promise<void> {
  fastify.get("/readiness", async (_req: any, reply: any) => {
    const results = await Promise.all(
      UPSTREAM_SERVICES.map((svc) =>
        probeUpstream(svc.name, svc.url(), svc.healthPath),
      ),
    );

    const ready = results.every((r) => r.status === "ready");

    return reply.status(ready ? 200 : 503).send({
      service: "api-gateway",
      status: ready ? "ready" : "not_ready",
      policy:
        "200 when all required product upstreams are reachable; 503 otherwise. Deferred Admin/Analytics/Notification are excluded.",
      timestamp: new Date().toISOString(),
      upstreams: results,
    });
  });

  // Back-compat alias used by older probes
  fastify.get("/system/health", async (_req: any, reply: any) => {
    return reply.redirect("/readiness");
  });
}
