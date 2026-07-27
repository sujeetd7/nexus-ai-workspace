import { NextFunction, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";

export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  req.requestId = (req.headers["x-request-id"] as string) || uuidv4();
  res.setHeader("x-request-id", req.requestId);
  next();
}
