import { Request, Response } from "express";

import { WorkspaceBillingService } from "../services/workspace-billing.service";

export class WorkspaceBillingController {
  private service = new WorkspaceBillingService();

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
