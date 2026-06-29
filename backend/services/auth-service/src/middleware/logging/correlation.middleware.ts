import { Request, Response, NextFunction } from "express";
import { v4 as uuid } from "uuid";

export function correlationMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const requestId = String(
    req.headers["x-request-id"] || uuid()
  );

  req.requestId = requestId;

  res.setHeader(
    "x-request-id",
    requestId
  );

  next();
}