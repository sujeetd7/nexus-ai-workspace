import { Request, Response } from "express";

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

  accept = async (req: Request, res: Response) => {
    const invitation = await this.service.acceptInvitation(req.body.token);

    res.json(invitation);
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
