import { Request, Response } from "express";

import { WorkspaceSettingService } from "../services/workspace-setting.service";

export class WorkspaceSettingController {
  private service = new WorkspaceSettingService();

  create = async (req: Request, res: Response) => {
    const result = await this.service.create(req.params.id as string, req.body);

    res.status(201).json(result);
  };

  get = async (req: Request, res: Response) => {
    const result = await this.service.get(req.params.id as string);

    res.json(result);
  };

  update = async (req: Request, res: Response) => {
    const result = await this.service.update(req.params.id as string, req.body);

    res.json(result);
  };
}
