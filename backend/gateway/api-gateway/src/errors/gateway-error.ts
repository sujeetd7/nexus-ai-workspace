/**
 * Gateway error envelope.
 * Preserves upstream status/code when safe; never leaks stacks or internal URLs.
 */

export interface GatewayErrorBody {
  error: {
    code: string;
    message: string;
    correlationId?: string;
  };
}

export function gatewayError(
  code: string,
  message: string,
  correlationId?: string,
): GatewayErrorBody {
  return {
    error: {
      code,
      message,
      ...(correlationId ? { correlationId } : {}),
    },
  };
}

function collectErrorCodes(err: unknown): string[] {
  const codes: string[] = [];
  const walk = (value: unknown, depth: number) => {
    if (!value || depth > 4 || typeof value !== "object") return;

    const candidate = value as {
      code?: unknown;
      errno?: unknown;
      message?: unknown;
      cause?: unknown;
      error?: unknown;
    };

    if (typeof candidate.code === "string") codes.push(candidate.code);
    if (typeof candidate.errno === "string") codes.push(candidate.errno);
    if (typeof candidate.message === "string") {
      if (candidate.message.includes("ECONNREFUSED")) {
        codes.push("ECONNREFUSED");
      }
      if (candidate.message.includes("ENOTFOUND")) codes.push("ENOTFOUND");
      if (candidate.message.includes("ETIMEDOUT")) codes.push("ETIMEDOUT");
      if (candidate.message.includes("fetch failed")) {
        codes.push("FETCH_FAILED");
      }
    }
    walk(candidate.cause, depth + 1);
    walk(candidate.error, depth + 1);
  };
  walk(err, 0);
  return codes;
}

/** Map undici/node network failures to Gateway status + code. */
export function classifyUpstreamFailure(err: unknown): {
  status: number;
  code: string;
  message: string;
  matched: boolean;
} {
  const codes = collectErrorCodes(err);
  const anyErr = err as { statusCode?: number };

  if (
    codes.some((c) =>
      [
        "UND_ERR_CONNECT_TIMEOUT",
        "ETIMEDOUT",
        "UND_ERR_HEADERS_TIMEOUT",
      ].includes(c),
    )
  ) {
    return {
      status: 504,
      code: "upstream_timeout",
      message: "Upstream service timed out",
      matched: true,
    };
  }

  if (
    codes.some((c) =>
      [
        "ECONNREFUSED",
        "ENOTFOUND",
        "EAI_AGAIN",
        "UND_ERR_SOCKET",
        "ECONNRESET",
        "FETCH_FAILED",
        "UND_ERR_CONNECT",
      ].includes(c),
    )
  ) {
    return {
      status: 502,
      code: "upstream_unavailable",
      message: "Upstream service unavailable",
      matched: true,
    };
  }

  if (typeof anyErr?.statusCode === "number" && anyErr.statusCode >= 500) {
    return {
      status: anyErr.statusCode,
      code: "upstream_error",
      message: "Upstream service error",
      matched: true,
    };
  }

  return {
    status: 502,
    code: "upstream_unavailable",
    message: "Upstream service unavailable",
    matched: false,
  };
}
