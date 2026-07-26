import jwt from "jsonwebtoken";
import { env } from "../config/env";

export async function authenticate(req: any, reply: any) {
  const authHeader = req.headers?.authorization;

  if (!authHeader) {
    return reply.status(401).send({
      error: "Unauthorized",
    });
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as any;

    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  } catch {
    return reply.status(401).send({
      error: "Invalid token",
    });
  }
}
