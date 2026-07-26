import { Request, Response } from "express";

import { EvaluationService } from "../services/evaluation.service";

export class EvaluationController {
  private readonly service = new EvaluationService();

  run = async (req: Request, res: Response) => {
    const result = await this.service.evaluate(req.body);

    res.status(201).json(result);
  };

  history = async (req: Request, res: Response) => {
    const result = await this.service.history();

    res.json(result);
  };

  details = async (req: Request, res: Response) => {
    const result = await this.service.details(req.params.id as string);

    res.json(result);
  };
}
