import { Request, Response, NextFunction } from "express";
import { logger } from "../../config/logger";

export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const startTime = Date.now();

res.on("finish", () => {
    logger.info({
  requestId: req.requestId,
  method: req.method,
  url: req.originalUrl,
  status: res.statusCode,
  duration: `${Date.now() - startTime}ms`,
});
});

  next();
}