import { Request, Response } from "express";

import { DocumentService } from "../services/document.service";

export class DocumentController {
  private service = new DocumentService();

  create = async (req: Request, res: Response) => {
    const document = await this.service.create(req.body);

    res.status(201).json(document);
  };

  list = async (req: Request, res: Response) => {
    const documents = await this.service.list();

    res.json(documents);
  };

  get = async (req: Request, res: Response) => {
    const document = await this.service.get(req.params.id as string);

    res.json(document);
  };

  update = async (req: Request, res: Response) => {
    const document = await this.service.update(
      req.params.id as string,
      req.body,
    );

    res.json(document);
  };

  delete = async (req: Request, res: Response) => {
    await this.service.delete(req.params.id as string);

    res.json({
      message: "Document deleted",
    });
  };
}
