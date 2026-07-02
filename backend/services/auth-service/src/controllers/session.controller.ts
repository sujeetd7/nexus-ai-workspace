import { ApiError } from "@middleware/error/api-error";
import { Request, Response } from "express";
import { authService } from "../services/auth/auth.service";

interface SessionParams {
  sessionId: string;
}

export class SessionController {
  async getSessions(req: Request, res: Response) {
    if (!req.user) {
      throw new ApiError(401, "UNAUTHORIZED", "Authentication required");
    }

    const sessions = await authService.getSessions(req.user.id);

    return res.json({
      success: true,
      data: sessions,
    });
  }

  async logoutAll(req: Request, res: Response) {
    if (!req.user) {
      throw new ApiError(401, "UNAUTHORIZED", "Authentication required");
    }

    await authService.logoutAll(req.user.id);

    return res.json({
      success: true,
      message: "Logged out from all devices",
    });
  }

  async revokeSession(req: Request<SessionParams>, res: Response) {
    if (!req.user) {
      throw new ApiError(401, "UNAUTHORIZED", "Authentication required");
    }

    await authService.revokeSession(req.user.id, req.params.sessionId);

    return res.json({
      success: true,
      message: "Session revoked",
    });
  }
}

export const sessionController = new SessionController();
