import { NextFunction, Request, Response } from "express";

import { AppError } from "../errors/app-error";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  const correlationId =
    (req.headers["x-correlation-id"] as string | undefined) ??
    (req as Request & { correlationId?: string }).correlationId;

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(correlationId ? { correlationId } : {}),
      },
    });
  }

  // Log full error server-side only — never serialize stack to clients.
  console.error(err);

  return res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Something went wrong.",
      ...(correlationId ? { correlationId } : {}),
    },
  });
};
