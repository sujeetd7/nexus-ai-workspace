import { Request, Response } from "express";
import { healthService } from "../services/health.service";

export const getHealth = (_req: Request, res: Response) => {
  res.status(200).json(healthService());
};
