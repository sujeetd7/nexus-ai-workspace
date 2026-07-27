import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { logger } from "../../config/logger";
import { ApiError } from "./api-error";

function readErrorFields(err: unknown): {
  statusCode: number;
  code: string;
  message: string;
  name?: string;
} {
  if (err instanceof ApiError) {
    return {
      statusCode: err.statusCode,
      code: err.code,
      message: err.message,
      name: err.name,
    };
  }

  if (err instanceof Error) {
    const withMeta = err as Error & {
      statusCode?: unknown;
      code?: unknown;
    };

    return {
      statusCode:
        typeof withMeta.statusCode === "number" ? withMeta.statusCode : 500,
      code:
        typeof withMeta.code === "string"
          ? withMeta.code
          : "INTERNAL_SERVER_ERROR",
      message: err.message || "Internal server error",
      name: err.name,
    };
  }

  return {
    statusCode: 500,
    code: "INTERNAL_SERVER_ERROR",
    message: "Internal server error",
  };
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  void next;

  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
      },
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
    });
  }

  const { statusCode, code, message, name } = readErrorFields(err);

  if (!statusCode || statusCode >= 500) {
    logger.error({
      err: {
        name,
        message,
        code,
      },
      requestId: req.requestId,
    });
  }

  return res.status(statusCode || 500).json({
    success: false,
    error: {
      code: code || "INTERNAL_SERVER_ERROR",
      message: message || "Internal server error",
    },
    requestId: req.requestId,
    timestamp: new Date().toISOString(),
  });
}
