import { Request, Response } from "express";

import { PromptService } from "../services/prompt.service";

export class PromptController {
  private service = new PromptService();

  create = async (req: Request, res: Response) => {
    const prompt = await this.service.createPrompt(req.body);

    res.status(201).json(prompt);
  };

  createVersion = async (req: Request, res: Response) => {
    const version = await this.service.createVersion(req.body);

    res.status(201).json(version);
  };

  execute = async (req: Request, res: Response) => {
    const execution = await this.service.execute(req.body);

    res.json(execution);
  };

  executeDirect = async (req: Request, res: Response) => {
    const result = await this.service.executeDirect(req.body);

    res.json(result);
  };

  executePublished = async (req: Request, res: Response) => {
    const result = await this.service.executePublished(req.body);

    res.json(result);
  };

  rollback = async (req: Request, res: Response) => {
    const result = await this.service.rollback(req.body);

    res.json(result);
  };

  history = async (_req: Request, res: Response) => {
    res.json(await this.service.executionHistory());
  };

  historyByPrompt = async (req: Request, res: Response) => {
    res.json(
      await this.service.executionHistoryByPrompt(
        req.params.promptId as string,
      ),
    );
  };

  execution = async (req: Request, res: Response) => {
    res.json(
      await this.service.executionDetails(req.params.executionId as string),
    );
  };

  playground = async (req: Request, res: Response) => {
    const result = await this.service.playground(req.body);

    res.json(result);
  };

  list = async (req: Request, res: Response) => {
    const prompts = await this.service.list(
      req.query as Record<string, string | undefined>,
    );

    res.json(prompts);
  };

  get = async (req: Request, res: Response) => {
    const prompt = await this.service.get(req.params.id as string);

    res.json(prompt);
  };

  delete = async (req: Request, res: Response) => {
    await this.service.delete(req.params.id as string);

    res.json({
      message: "deleted",
    });
  };

  publish = async (req: Request, res: Response) => {
    const result = await this.service.publish(req.params.versionId as string);

    res.json(result);
  };

  compare = async (req: Request, res: Response) => {
    const result = await this.service.compare(req.body);

    res.json(result);
  };

  analytics = async (req: Request, res: Response) => {
    const result = await this.service.analytics(
      req.query.promptId as string | undefined,
    );

    res.json(result);
  };
}
