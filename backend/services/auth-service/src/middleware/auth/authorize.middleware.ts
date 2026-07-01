import { NextFunction, Request, Response } from "express";

import { UserRole } from "@prisma/client";
import { ApiError } from "../error/api-error";

export function authorize(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ApiError(401, "UNAUTHORIZED", "Authentication required"));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, "FORBIDDEN", "Insufficient permissions"));
    }

    next();
  };
}
