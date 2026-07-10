import { NextFunction, Request, Response } from "express";
import { ProviderError } from "../errors/provider.error";
import logger from "../utils/logger";

export function errorMiddleware(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (err instanceof ProviderError) {
    return res.status(err.status).json({
      provider: err.provider,
      code: err.code,
      message: err.message,
      details: err.details,
    });
  }

  console.error(err);
  logger.error(err);
  return res.status(500).json({
    code: "internal_server_error",
    message: "Internal Server Error",
  });
}
