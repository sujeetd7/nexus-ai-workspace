import { Request, Response } from "express";
import { DatasetService } from "./dataset.service";

export class DatasetController {
  private readonly service = new DatasetService();

  create = async (req: Request, res: Response) => {
    const dataset = this.service.create(
      req.body.name,
      req.body.cases ?? [],
      req.body.description,
    );
    res.status(201).json(dataset);
  };

  list = async (_req: Request, res: Response) => {
    res.json(this.service.list());
  };

  get = async (req: Request, res: Response) => {
    const dataset = this.service.get(req.params.id as string);
    if (!dataset) {
      res.status(404).json({ message: "Dataset not found." });
      return;
    }
    res.json(dataset);
  };

  update = async (req: Request, res: Response) => {
    const dataset = this.service.update(req.params.id as string, req.body);
    if (!dataset) {
      res.status(404).json({ message: "Dataset not found." });
      return;
    }
    res.json(dataset);
  };

  delete = async (req: Request, res: Response) => {
    const deleted = this.service.delete(req.params.id as string);
    res.json({
      success: deleted,
      message: deleted ? "Dataset deleted." : "Dataset not found.",
    });
  };

  addCase = async (req: Request, res: Response) => {
    const dataset = this.service.addCase(req.params.id as string, req.body);
    if (!dataset) {
      res.status(404).json({ message: "Dataset not found." });
      return;
    }
    res.json(dataset);
  };

  removeCase = async (req: Request, res: Response) => {
    const dataset = this.service.removeCase(
      req.params.id as string,
      req.params.caseId as string,
    );
    if (!dataset) {
      res.status(404).json({ message: "Dataset not found." });
      return;
    }
    res.json(dataset);
  };
}
