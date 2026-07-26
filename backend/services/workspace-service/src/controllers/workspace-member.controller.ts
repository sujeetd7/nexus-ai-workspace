import { Request, Response } from "express";

import { WorkspaceMemberService } from "../services/workspace-member.service";

export class WorkspaceMemberController {
  private service = new WorkspaceMemberService();

  addMember = async (req: Request, res: Response) => {
    const member = await this.service.addMember({
      workspaceId: req.params.id,
      ...req.body,
    });

    res.status(201).json(member);
  };

  listMembers = async (req: Request, res: Response) => {
    const members = await this.service.listMembers(req.params.id as string);

    res.json(members);
  };

  updateRole = async (req: Request, res: Response) => {
    const member = await this.service.updateRole(
      req.params.id as string,
      req.params.memberId as string,
      req.body.role,
    );

    res.json(member);
  };

  removeMember = async (req: Request, res: Response) => {
    await this.service.removeMember(
      req.params.id as string,
      req.params.memberId as string,
    );

    res.json({
      message: "Member removed",
    });
  };

  getMember = async (req: Request, res: Response) => {
    const member = await this.service.getMember(
      req.params.id as string,
      req.params.memberId as string,
    );

    if (!member) {
      return res.status(404).json({
        message: "Member not found",
      });
    }

    return res.json(member);
  };
}
