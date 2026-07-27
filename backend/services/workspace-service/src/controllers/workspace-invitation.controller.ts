import { Request, Response } from "express";

import { AuthenticatedRequest } from "../middleware/auth/authenticate.middleware";
import { WorkspaceInvitationService } from "../services/workspace-invitation.service";

export class WorkspaceInvitationController {
  private service = new WorkspaceInvitationService();

  create = async (req: Request, res: Response) => {
    const invitation = await this.service.createInvitation({
      workspaceId: req.params.id,
      ...req.body,
    });

    res.status(201).json(invitation);
  };

  list = async (req: Request, res: Response) => {
    const invitations = await this.service.getInvitations(
      req.params.id as string,
    );

    res.json(invitations);
  };

  /**
   * Accept invitation using verified access-token subject only.
   * Body `userId` is ignored and must not override identity (W3).
   */
  accept = async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const body = req.body as {
      token: string;
      userId?: string;
      email?: string;
    };

    const userId = authReq.auth?.userId ?? authReq.user?.id;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    try {
      const invitation = await this.service.acceptInvitation(
        body.token,
        userId,
        body.email ?? authReq.auth?.email ?? authReq.user?.email,
      );

      res.json(invitation);
    } catch (err: any) {
      const message = err?.message ?? "Invitation accept failed";

      if (message.includes("identity mismatch")) {
        res.status(403).json({ error: message });
        return;
      }

      if (
        message.includes("not found") ||
        message.includes("expired") ||
        message.includes("already accepted")
      ) {
        res.status(400).json({ error: message });
        return;
      }

      throw err;
    }
  };

  reject = async (req: Request, res: Response) => {
    const invitation = await this.service.rejectInvitation(req.body.token);

    res.json(invitation);
  };

  delete = async (req: Request, res: Response) => {
    await this.service.deleteInvitation(req.params.invitationId as string);

    res.json({
      message: "Invitation deleted",
    });
  };
}
