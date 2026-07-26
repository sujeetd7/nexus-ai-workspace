import { Request, Response } from "express";

import { env } from "../config/env";

export function health(req: Request, res: Response) {
  res.status(200).json({
    success: true,
    data: {
      service: env.SERVICE_NAME,
      environment: env.NODE_ENV,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    },
    requestId: req.requestId,
  });
}
