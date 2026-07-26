import crypto from "crypto";
export async function requestIdMiddleware(req: any, reply: any) {
  const requestId = crypto.randomUUID();

  req.requestId = requestId;

  reply.header("x-request-id", requestId);
}
