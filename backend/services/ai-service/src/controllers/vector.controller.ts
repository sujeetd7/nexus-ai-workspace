import { Request, Response } from "express";

import { IndexBatchDto } from "../dto/index-batch.dto";
import { UpsertVectorDto } from "../dto/upsert-vector.dto";
import { VectorService } from "../services/vector.service";

export class VectorController {
  private readonly service = new VectorService();

  upsert = async (req: Request, res: Response) => {
    const dto = req.body as UpsertVectorDto;

    const result = await this.service.upsert(dto);

    res.status(200).json(result);
  };

  upsertBatch = async (req: Request, res: Response) => {
    const dto = req.body as IndexBatchDto;

    const result = await this.service.upsertBatch(dto);

    res.status(200).json(result);
  };

  search = async (req: Request, res: Response) => {
    const result = await this.service.search(req.body);

    res.json(result);
  };
}
