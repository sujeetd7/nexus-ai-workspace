import { Request, Response, NextFunction } from "express";
import { ApiError } from "./api-error";
import { logger } from "../../config/logger";

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  logger.error({
    requestId: req.requestId,
    error: err.message,
    stack: err.stack,
  });

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
      requestId: req.requestId,
    });
  }

  return res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Something went wrong",
    },
    requestId: req.requestId,
  });
}