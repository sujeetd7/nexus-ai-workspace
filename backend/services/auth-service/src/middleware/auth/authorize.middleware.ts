import {
  Request,
  Response,
  NextFunction,
} from "express";

import { ApiError }
  from "../error/api-error";

import { Permission }
  from "../../types/auth/permissions";

import { ROLE_PERMISSIONS }
  from "../../config/auth/rbac";

export function authorize(
  permission: Permission,
) {

  return (
    req: Request,
    _res: Response,
    next: NextFunction,
  ) => {

    const user =
      (req as Request & {
        user?: {
          role: string;
        };
      }).user;

    if (!user) {
      return next(
        new ApiError(
          401,
          "UNAUTHORIZED",
          "Unauthorized",
        ),
      );
    }

    const permissions =
      ROLE_PERMISSIONS[
        user.role as keyof typeof ROLE_PERMISSIONS
      ];

    if (
      !permissions?.includes(permission)
    ) {
      return next(
        new ApiError(
          403,
          "FORBIDDEN",
          "Permission denied",
        ),
      );
    }

    next();
  };
}