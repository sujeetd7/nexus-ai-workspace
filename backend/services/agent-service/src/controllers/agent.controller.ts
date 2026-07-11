import { Request, Response } from "express";

import { AgentService } from "../services/agent.service";

export class AgentController {
  private readonly service = new AgentService();

  create = async (req: Request, res: Response) => {
    const agent = await this.service.create(req.body);

    res.status(201).json(agent);
  };

  list = async (req: Request, res: Response) => {
    const agents = await this.service.list({
      workspaceId: req.query.workspaceId as string,
    });

    res.json(agents);
  };

  get = async (req: Request, res: Response) => {
    const agent = await this.service.get(req.params.id as string);

    res.json(agent);
  };

  update = async (req: Request, res: Response) => {
    const agent = await this.service.update(req.params.id as string, req.body);

    res.json(agent);
  };

  delete = async (req: Request, res: Response) => {
    const result = await this.service.delete(req.params.id as string);

    res.json(result);
  };
}
