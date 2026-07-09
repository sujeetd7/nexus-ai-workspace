import { NextFunction, Request, Response } from "express";

export function errorMiddleware(
  err: any,

  req: Request,

  res: Response,

  next: NextFunction,
) {
  console.error(err);

  res.status(500).json({
    message: err.message,
  });
}
