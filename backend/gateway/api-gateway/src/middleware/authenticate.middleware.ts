import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { gatewayError } from "../errors/gateway-error";

export interface GatewayUser {
  id: string;
  email?: string;
  role?: string;
}

declare module "fastify" {
  interface FastifyRequest {
    user?: GatewayUser;
    requestId?: string;
    correlationId?: string;
  }
}

/**
 * Verify access tokens only (same secret as Auth JwtService).
 * Refresh-token verification remains in Auth Service.
 */
export async function authenticate(req: any, reply: any): Promise<void> {
  const authHeader = req.headers?.authorization as string | undefined;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return reply.status(401).send(
      gatewayError("unauthorized", "Missing or invalid Authorization header", req.correlationId),
    );
  }

  const token = authHeader.slice("Bearer ".length).trim();

  if (!token) {
    return reply.status(401).send(
      gatewayError("unauthorized", "Missing access token", req.correlationId),
    );
  }

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as jwt.JwtPayload;

    if (!payload.sub || typeof payload.sub !== "string") {
      return reply.status(401).send(
        gatewayError("unauthorized", "Invalid token subject", req.correlationId),
      );
    }

    req.user = {
      id: payload.sub,
      email: typeof payload.email === "string" ? payload.email : undefined,
      role: typeof payload.role === "string" ? payload.role : undefined,
    };
  } catch {
    return reply.status(401).send(
      gatewayError("unauthorized", "Invalid or expired access token", req.correlationId),
    );
  }
}
