import { randomUUID } from "crypto";
import { NextFunction, Request, Response } from "express";

export function correlationMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const requestId = String(req.headers["x-request-id"] || randomUUID());

  req.requestId = requestId;

  res.setHeader("x-request-id", requestId);

  next();
}
