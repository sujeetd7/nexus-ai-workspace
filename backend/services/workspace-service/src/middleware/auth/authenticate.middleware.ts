import { NextFunction, Request, Response } from "express";
import * as jwt from "jsonwebtoken";

export interface AuthenticatedRequest extends Request {
  auth?: {
    userId: string;
    role?: string;
    email?: string;
  };
  user?: {
    id: string;
    role?: string;
    email?: string;
  };
}

function accessSecret(): string {
  return process.env.JWT_ACCESS_SECRET || "development-secret";
}

/**
 * Verify the Bearer access token using the Auth access-token secret.
 * Identity is derived only from verified claims — never from body or
 * client-supplied x-user-* headers.
 */
export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const authReq = req as AuthenticatedRequest;

  // Strip spoofed identity headers; Gateway may reinject after its own verify,
  // but Workspace still derives identity from Authorization independently.
  delete authReq.headers["x-user-id"];
  delete authReq.headers["x-user-role"];
  delete authReq.headers["x-user-email"];

  const authHeader = authReq.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = authHeader.slice("Bearer ".length).trim();

  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const payload = jwt.verify(token, accessSecret()) as jwt.JwtPayload;

    if (!payload.sub || typeof payload.sub !== "string") {
      res.status(401).json({ error: "Invalid token subject" });
      return;
    }

    authReq.auth = {
      userId: payload.sub,
      role: typeof payload.role === "string" ? payload.role : undefined,
      email: typeof payload.email === "string" ? payload.email : undefined,
    };

    authReq.user = {
      id: payload.sub,
      role: authReq.auth.role,
      email: authReq.auth.email,
    };

    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired access token" });
  }
}
