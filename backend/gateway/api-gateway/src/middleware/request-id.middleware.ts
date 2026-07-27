import crypto from "crypto";

const REQUEST_ID_HEADER = "x-request-id";
const CORRELATION_ID_HEADER = "x-correlation-id";

const SAFE_ID = /^[\w.:-]{1,128}$/;

function pickIncomingId(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed || !SAFE_ID.test(trimmed)) return undefined;
  return trimmed;
}

/**
 * Reuse a safe incoming request/correlation ID; otherwise generate one.
 * Propagates both x-request-id and x-correlation-id (same value when only one supplied).
 */
export async function requestIdMiddleware(req: any, reply: any): Promise<void> {
  const incomingRequestId = pickIncomingId(req.headers[REQUEST_ID_HEADER]);
  const incomingCorrelationId = pickIncomingId(req.headers[CORRELATION_ID_HEADER]);

  const id = incomingRequestId ?? incomingCorrelationId ?? crypto.randomUUID();

  req.requestId = id;
  req.correlationId = id;

  req.headers[REQUEST_ID_HEADER] = id;
  req.headers[CORRELATION_ID_HEADER] = id;

  reply.header(REQUEST_ID_HEADER, id);
  reply.header(CORRELATION_ID_HEADER, id);
}
