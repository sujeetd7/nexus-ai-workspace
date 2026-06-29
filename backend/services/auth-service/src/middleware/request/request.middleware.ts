import { Request, Response, NextFunction } from "express";
import { v4 as uuid } from "uuid";

export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const requestId = uuid();

  req.headers["x-request-id"] =
    requestId;

  const started =
    Date.now();

  res.on("finish", () => {
    console.log({
      requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration:
        Date.now() - started,
    });
  });

  next();
}