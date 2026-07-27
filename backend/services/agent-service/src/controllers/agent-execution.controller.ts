import { NextFunction, Request, Response } from "express";

import { AgentRuntimeService } from "../services/agent-execution.service";

export class AgentRuntimeController {
  private readonly service = new AgentRuntimeService();

  execute = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.execute(req.body);
      res.json(result);
    } catch (error) {
      // Delegate to centralized errorHandler — never serialize stacks/Axios/Kernel URLs.
      next(error);
    }
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
