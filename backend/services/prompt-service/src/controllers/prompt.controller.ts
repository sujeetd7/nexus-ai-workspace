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

  list = async (req: Request, res: Response) => {
    const prompts = await this.service.list();

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
}
