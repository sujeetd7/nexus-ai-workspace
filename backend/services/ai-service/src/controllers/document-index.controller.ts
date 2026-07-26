import { NextFunction, Request, Response } from "express";

import { DeleteDocumentDto } from "../dto/delete-document.dto";
import { IndexDocumentDto } from "../dto/index-document.dto";
import { IndexStatsDto, IndexStatsResponseDto } from "../dto/index-stats.dto";
import { DocumentIndexService } from "../services/document-index.service";

const service = new DocumentIndexService();

export async function indexDocument(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const dto = req.body as IndexDocumentDto;

    const result = await service.index(dto);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function reindexDocument(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const dto = req.body as IndexDocumentDto;

    const result = await service.reindex(dto);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function deleteDocument(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const dto = req.body as DeleteDocumentDto;

    const result = await service.delete({
      workspaceId: dto.workspaceId,

      provider: dto.provider,

      model: dto.model,

      documentId: dto.documentId,
    });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function indexStats(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const dto = req.body as IndexStatsDto;

    const result = await service.getStats(dto);

    res.status(200).json(result as IndexStatsResponseDto);
  } catch (error) {
    next(error);
  }
}
