import { Request, Response } from "express";

import { WorkspacePermissionService } from "../services/workspace-permission.service";

export class WorkspacePermissionController {
  private service = new WorkspacePermissionService();

  grant = async (req: Request, res: Response) => {
    const permission = await this.service.grantPermission(
      req.params.id as string,
      req.body.userId as string,
      req.body.permission as string,
    );

    res.status(201).json(permission);
  };

  get = async (req: Request, res: Response) => {
    const permissions = await this.service.getPermissions(
      req.params.id as string,
      req.params.userId as string,
    );

    res.json(permissions);
  };

  revoke = async (req: Request, res: Response) => {
    await this.service.revokePermission(
      req.params.id as string,
      req.params.userId as string,
      req.params.permission as string,
    );

    res.json({
      message: "Permission revoked",
    });
  };
}
