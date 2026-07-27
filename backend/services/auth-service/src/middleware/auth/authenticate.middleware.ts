import { NextFunction, Request, Response } from "express";

import { jwtService } from "../../tokens/access/jwt.service";
import { logger } from "../../config/logger";
import { ApiError } from "../error/api-error";

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new ApiError(401, "UNAUTHORIZED", "Authentication required");
    }

    const token = authHeader.replace("Bearer ", "");
    const payload = jwtService.verifyAccessToken(token);

    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };

    next();
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }

    logger.warn({
      event: "AUTHENTICATE_FAILED",
      reason: error instanceof Error ? error.name : "UNKNOWN",
    });

    next(new ApiError(401, "INVALID_TOKEN", "Invalid or expired token"));
  }
}
