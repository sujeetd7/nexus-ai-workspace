import { NextFunction, Request, Response } from "express";
import logger from "../utils/logger";

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  res.on("finish", () => {
    const took = Date.now() - start;
    logger.info(
      `${req.method} ${req.originalUrl} ${res.statusCode} - ${took}ms`,
    );
  });
  next();
}
