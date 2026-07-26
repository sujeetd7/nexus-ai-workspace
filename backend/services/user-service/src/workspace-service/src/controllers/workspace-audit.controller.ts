import { Request, Response } from "express";

import { WorkspaceAuditService } from "../services/workspace-audit.service";

export class WorkspaceAuditController {
  private service = new WorkspaceAuditService();

  create = async (req: Request, res: Response) => {
    const result = await this.service.create(req.params.id as string, req.body);

    res.status(201).json(result);
  };

  list = async (req: Request, res: Response) => {
    const result = await this.service.list(req.params.id as string);

    res.json(result);
  };
}
