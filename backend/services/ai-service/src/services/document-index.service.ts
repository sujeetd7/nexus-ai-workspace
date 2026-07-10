import { ChunkerFactory } from "../chunking/chunker.factory";
import { DeleteDocumentDto } from "../dto/delete-document.dto";
import { IndexDocumentResponseDto } from "../dto/index-document-response.dto";
import { IndexDocumentDto } from "../dto/index-document.dto";
import { IndexStatsDto, IndexStatsResponseDto } from "../dto/index-stats.dto";
import { VectorService } from "./vector.service";

export class DocumentIndexService {
  private readonly vectorService = new VectorService();

  async index(dto: IndexDocumentDto): Promise<IndexDocumentResponseDto> {
    const chunker = ChunkerFactory.create(dto.type ?? "text");

    const chunks = chunker.chunk(dto.content);

    await this.vectorService.upsertBatch({
      workspaceId: dto.workspaceId,

      provider: dto.provider,

      model: dto.model,

      documentId: dto.documentId,

      title: dto.title,

      chunks,

      metadata: dto.metadata,
    });

    return {
      documentId: dto.documentId,

      chunks: chunks.length,

      indexed: true,

      provider: dto.provider,

      model: dto.model ?? "default",
    };
  }

  async reindex(dto: IndexDocumentDto): Promise<IndexDocumentResponseDto> {
    // Delete existing vectors for the document
    await this.vectorService.deleteByDocumentId({
      workspaceId: dto.workspaceId,

      provider: dto.provider,

      model: dto.model,

      documentId: dto.documentId,
    });

    // Index again
    const chunker = ChunkerFactory.create(dto.type ?? "text");

    const chunks = chunker.chunk(dto.content);

    await this.vectorService.upsertBatch({
      workspaceId: dto.workspaceId,

      provider: dto.provider,

      model: dto.model,

      documentId: dto.documentId,

      title: dto.title,

      chunks,

      metadata: dto.metadata,
    });

    return {
      documentId: dto.documentId,

      chunks: chunks.length,

      indexed: true,

      provider: dto.provider,

      model: dto.model ?? "default",
    };
  }

  async delete(dto: DeleteDocumentDto): Promise<{ deleted: boolean }> {
    await this.vectorService.deleteByDocumentId({
      workspaceId: dto.workspaceId,

      provider: dto.provider,

      model: dto.model,

      documentId: dto.documentId,
    });

    return { deleted: true };
  }

  async getStats(dto: IndexStatsDto): Promise<IndexStatsResponseDto> {
    const res = await this.vectorService.getIndexStats({
      workspaceId: dto.workspaceId,
      provider: dto.provider,
      model: dto.model,
    });

    return { workspaceId: dto.workspaceId, collections: res.collections };
  }
}
