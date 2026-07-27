import { NextFunction, Request, Response } from "express";

export function loggerMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const start = Date.now();

  console.log(
    `[${new Date().toISOString()}] ${req.method} ${req.path} - RequestId: ${req.requestId}`,
  );

  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms - RequestId: ${req.requestId}`,
    );
  });

  next();
}
