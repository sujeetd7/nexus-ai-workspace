import { Response } from "express";

export function success<T>(res: Response, data: T, status = 200) {
  return res.status(status).json({
    success: true,
    data,
    requestId: res.getHeader("x-request-id"),
    timestamp: new Date().toISOString(),
  });
}

export function failure(
  res: Response,
  code: string,
  message: string,
  status = 400,
  details?: unknown,
) {
  return res.status(status).json({
    success: false,
    error: {
      code,
      message,
      details,
    },
    requestId: res.getHeader("x-request-id"),
    timestamp: new Date().toISOString(),
  });
}
