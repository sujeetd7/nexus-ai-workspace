import { Request, Response } from "express";

import { AgentRuntimeService } from "../services/agent-execution.service";

export class AgentRuntimeController {
  private readonly service = new AgentRuntimeService();

  execute = async (req: Request, res: Response) => {
    try {
      console.log(
        "[CONTROLLER] Request body:",
        JSON.stringify(req.body, null, 2),
      );

      const result = await this.service.execute(req.body);

      console.log(
        "[CONTROLLER] Execution result:",
        JSON.stringify(result, null, 2),
      );

      res.json(result);
    } catch (error) {
      console.error("[CONTROLLER] ERROR:", error);
      console.error(
        "[CONTROLLER] Stack trace:",
        error instanceof Error ? error.stack : "No stack trace",
      );

      res.status(500).json({
        error: "Execution failed",
        message: error instanceof Error ? error.message : "Unknown error",
        details: error instanceof Error ? error.stack : error,
      });
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
