import { NextFunction, Request, Response } from "express";

import { authService } from "./../../services/auth/auth.service";

import { RegisterRequest } from "../../dto/requests/register.request";

import { ForgotPasswordRequest } from "../../dto/requests/forgot-password.request";
import { LoginRequest } from "../../dto/requests/login.request";
import { ResendVerificationRequest } from "../../dto/requests/resend-verification.request";
import { VerifyEmailRequest } from "../../dto/requests/verify-email.request";
import { SessionContext } from "../../types/interfaces/auth.interface";

import { ResetPasswordRequest } from "../../dto/requests/reset-password.request";

interface RefreshRequest {
  refreshToken: string;
}

interface LogoutRequest {
  refreshToken: string;
}

export class AuthController {
  /**
   * @swagger
   * /auth/register:
   *   post:
   *     summary: Register new user
   *     tags:
   *       - Authentication
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *               - password
   *             properties:
   *               email:
   *                 type: string
   *               password:
   *                 type: string
   *               firstName:
   *                 type: string
   *               lastName:
   *                 type: string
   *     responses:
   *       201:
   *         description: User registered
   *       409:
   *         description: Email exists
   */

  async register(
    req: Request<Record<string, never>, unknown, RegisterRequest>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const result = await authService.register(
        req.body,
        AuthController.getSessionContext(req),
      );

      return res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async login(
    req: Request<Record<string, never>, unknown, LoginRequest>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const result = await authService.login(
        req.body,
        AuthController.getSessionContext(req),
      );

      return res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async refresh(
    req: Request<Record<string, never>, unknown, RefreshRequest>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const result = await authService.refresh(
        req.body.refreshToken,
        AuthController.getSessionContext(req),
      );

      return res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async verifyEmail(
    req: Request<Record<string, never>, unknown, VerifyEmailRequest>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const result = await authService.verifyEmail(req.body);

      return res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async resendVerification(
    req: Request<Record<string, never>, unknown, ResendVerificationRequest>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const result = await authService.resendVerification(req.body);

      return res.status(202).json(result);
    } catch (error) {
      next(error);
    }
  }

  async forgotPassword(
    req: Request<Record<string, never>, unknown, ForgotPasswordRequest>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      await authService.forgotPassword(req.body.email);

      return res.json({
        success: true,
        message: "If the account exists, a password reset email has been sent.",
      });
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(
    req: Request<Record<string, never>, unknown, ResetPasswordRequest>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      await authService.resetPassword(req.body.token, req.body.password);

      return res.json({
        success: true,
        message: "Password reset successful",
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(
    req: Request<Record<string, never>, unknown, { refreshToken: string }>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      console.log("BODY:", req.body);

      if (!req.body || !req.body.refreshToken) {
        throw new Error("refreshToken missing");
      }

      await authService.logout(req.body.refreshToken);

      return res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  async sessions(req: Request, res: Response, next: NextFunction) {
    try {
      const sessions = await authService.getSessions(req.user!.id);

      return res.json(sessions);
    } catch (error) {
      next(error);
    }
  }

  async revokeSession(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      await authService.revokeSession(req.user!.id, req.params.id);

      return res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  async logoutAll(req: Request, res: Response, next: NextFunction) {
    try {
      await authService.logoutAll(req.user!.id);

      return res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  private static getSessionContext(req: Request): SessionContext {
    const rawDeviceName = req.header("x-device-name");

    return {
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      deviceName: rawDeviceName?.trim() || undefined,
    };
  }
}
export const authController = new AuthController();
