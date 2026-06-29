import {
  Request,
  Response,
  NextFunction,
} from "express";

import { authService }
  from "./../../services/auth/auth.service";

import { RegisterRequest }
  from "../../dto/requests/register.request";

import { LoginRequest }
  from "../../dto/requests/login.request";

interface RefreshRequest {
  refreshToken: string;
}

interface LogoutRequest {
  userId: string;
}

export class AuthController {

  async register(
    req: Request<Record<string, never>, unknown, RegisterRequest>,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result =
        await authService.register(
          req.body
        );

      return res
        .status(201)
        .json(result);

    } catch (error) {
      next(error);
    }
  }

  async login(
    req: Request<Record<string, never>, unknown, LoginRequest>,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result =
        await authService.login(
          req.body
        );

      return res.json(result);

    } catch (error) {
      next(error);
    }
  }

  async refresh(
    req: Request<Record<string, never>, unknown, RefreshRequest>,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result =
        await authService.refresh(
          req.body.refreshToken
        );

      return res.json(result);

    } catch (error) {
      next(error);
    }
  }

  async logout(
    req: Request<Record<string, never>, unknown, LogoutRequest>,
    res: Response,
    next: NextFunction
  ) {
    try {
      await authService.logout(
        req.body.userId
      );

      return res
        .status(204)
        .send();

    } catch (error) {
      next(error);
    }
  }
}

export const authController =
  new AuthController();
