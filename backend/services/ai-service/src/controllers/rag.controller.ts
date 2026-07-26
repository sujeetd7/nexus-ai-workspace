import { Request, Response } from "express";

import { RagQueryDto } from "../dto/rag-query.dto";

import { RagService } from "../services/rag.service";

export class RagController {
  private readonly service = new RagService();

  query = async (req: Request, res: Response) => {
    const result = await this.service.query(req.body as RagQueryDto);

    res.json(result);
  };
}
