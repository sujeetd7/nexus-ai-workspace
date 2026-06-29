import {
  Request,
  Response,
  NextFunction,
} from "express";

import { jwtService }
  from "../../tokens/access/jwt.service";

import { ApiError }
  from "../error/api-error";

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  try {

    const authHeader =
      req.headers.authorization;

    if (!authHeader) {
      throw new ApiError(
        401,
        "UNAUTHORIZED",
        "Authorization header missing",
      );
    }

    const token =
      authHeader.replace(
        "Bearer ",
        "",
      );

    const payload =
      jwtService.verifyAccessToken(
        token,
      );

    (
      req as Request & {
        user: typeof payload;
      }
    ).user = payload;

    next();

  } catch {

    next(
      new ApiError(
        401,
        "UNAUTHORIZED",
        "Invalid access token",
      ),
    );
  }
}