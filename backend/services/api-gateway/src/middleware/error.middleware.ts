import { NextFunction, Request, Response } from "express";

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  console.error(`[${new Date().toISOString()}] Error in ${req.method} ${req.path} - RequestId: ${req.requestId}`, err);

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || "Internal Server Error";

  res.status(statusCode).json({
    success: false,
    message,
    requestId: req.requestId,
    timestamp: new Date().toISOString(),
  });
}