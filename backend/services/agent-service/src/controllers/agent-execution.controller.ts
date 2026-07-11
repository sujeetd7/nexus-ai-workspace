import { Request, Response } from "express";

import { AgentRuntimeService } from "../services/agent-execution.service";

export class AgentRuntimeController {
  private readonly service = new AgentRuntimeService();

  execute = async (req: Request, res: Response) => {
    const result = await this.service.execute(req.body);

    res.json(result);
  };

  history = async (_req: Request, res: Response) => {
    res.json(await this.service.history());
  };

  historyByAgent = async (req: Request, res: Response) => {
    res.json(await this.service.historyByAgent(req.params.agentId as string));
  };

  execution = async (req: Request, res: Response) => {
    res.json(await this.service.execution(req.params.executionId as string));
  };
}
