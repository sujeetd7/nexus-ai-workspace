import {
  Request,
  Response,
  NextFunction,
} from "express";

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error(err);

  return res.status(
    err.statusCode || 500
  ).json({
    success: false,

    error: {
      code:
        err.code ||
        "INTERNAL_SERVER_ERROR",

      message:
        err.message ||
        "Internal server error",
    },

    requestId: req.requestId,

    timestamp:
      new Date().toISOString(),
  });
}