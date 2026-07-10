import { randomUUID } from "crypto";

import { UpsertVectorDto } from "../dto/upsert-vector.dto";

import { EmbeddingService } from "./embedding.service";

import { IndexBatchDto } from "src/dto/index-batch.dto";
import { SearchVectorDto } from "src/dto/search-vector.dto";
import { ChromaVectorStore } from "../vector/chroma-vector-store";

export class VectorService {
  private readonly embeddingService = new EmbeddingService();

  private readonly vectorStore = new ChromaVectorStore();

  async upsert(dto: UpsertVectorDto) {
    const embedding = await this.embeddingService.generate({
      provider: dto.provider,
      model: dto.model,
      input: dto.text,
    });

    const collection = `workspace-${dto.workspaceId}-${dto.provider}-${dto.model}`;

    await this.vectorStore.createCollection(collection);

    await this.vectorStore.upsert(
      collection,
      dto.id || randomUUID(),
      embedding.embeddings[0],
      dto.text,
      dto.metadata,
    );

    return {
      success: true,
      provider: embedding.provider,
      model: embedding.model,
      dimensions: embedding.dimensions,
    };
  }

  async upsertBatch(dto: IndexBatchDto) {
    const embeddings = await this.embeddingService.generateBatch(
      dto.provider,
      dto.model,
      dto.chunks,
    );

    const collection = `workspace-${dto.workspaceId}-${dto.provider}-${dto.model}`;

    await this.vectorStore.createCollection(collection);
    const ids: string[] = [];

    const documents: string[] = [];

    const embeddingsArray: number[][] = [];

    const metadatas: Record<string, string | number | boolean | null>[] = [];
    for (let i = 0; i < dto.chunks.length; i++) {
      ids.push(`${dto.documentId}-${i}`);

      documents.push(dto.chunks[i]);

      embeddingsArray.push(embeddings.embeddings[i]);

      metadatas.push({
        ...dto.metadata,

        documentId: dto.documentId,

        title: dto.title,

        chunk: i,
      });
    }

    await this.vectorStore.upsertBatch(
      collection,

      ids,

      embeddingsArray,

      documents,

      metadatas,
    );
    return {
      indexed: dto.chunks.length,
    };
  }

  async deleteByDocumentId(dto: {
    workspaceId: string;
    provider: string;
    model?: string;
    documentId: string;
  }) {
    const collection = `workspace-${dto.workspaceId}-${dto.provider}-${dto.model}`;

    // delete by metadata field 'documentId'
    await this.vectorStore.deleteByMetadata(collection, {
      documentId: dto.documentId,
    });

    return { deleted: true };
  }

  async search(dto: SearchVectorDto) {
    const embedding = await this.embeddingService.generate({
      provider: dto.provider,
      model: dto.model,
      input: dto.query,
    });

    const collection = `workspace-${dto.workspaceId}-${dto.provider}-${dto.model}`;

    return this.vectorStore.search(
      collection,
      embedding.embeddings[0],
      dto.limit,
    );
  }

  async getIndexStats(dto: {
    workspaceId: string;
    provider?: string;
    model?: string;
  }) {
    const stats: { name: string; count: number }[] = [];

    const prefix = `workspace-${dto.workspaceId}`;

    // If provider and model provided, target a single collection
    if (dto.provider && dto.model) {
      const collection = `${prefix}-${dto.provider}-${dto.model}`;
      const count = await this.vectorStore.getCollectionCount(collection);
      stats.push({ name: collection, count });
      return { workspaceId: dto.workspaceId, collections: stats };
    }

    // If provider provided only, attempt to list that provider's models.
    if (dto.provider) {
      // Attempt to list models by scanning collections via chroma client if available
      try {
        const clientAny: any =
          (this.vectorStore as any).chromaClient ?? undefined;
        if (!clientAny) {
          // build collection name with wildcard: best-effort single check
          const collection = `${prefix}-${dto.provider}-${dto.model ?? ""}`;
          const count = await this.vectorStore.getCollectionCount(collection);
          stats.push({ name: collection, count });
          return { workspaceId: dto.workspaceId, collections: stats };
        }
      } catch {
        // ignore and fallback
      }
    }

    // Fallback: check a best-effort single collection using just workspace prefix
    const collection = `${prefix}-${dto.provider ?? "default"}-${dto.model ?? "default"}`;
    const count = await this.vectorStore.getCollectionCount(collection);
    stats.push({ name: collection, count });

    return { workspaceId: dto.workspaceId, collections: stats };
  }
}
