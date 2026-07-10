import { SearchVectorResultDto } from "src/dto/search-vector-result.dto";
import logger from "../utils/logger";
import { chromaClient } from "./chroma.client";
import { VectorStore } from "./vector-store.interface";

export class ChromaVectorStore implements VectorStore {
  async health(): Promise<boolean> {
    try {
      await chromaClient.heartbeat();
      return true;
    } catch {
      return false;
    }
  }

  async createCollection(name: string): Promise<void> {
    await chromaClient.getOrCreateCollection({
      name,
      metadata: {
        "hnsw:space": "cosine",
      },
    });
  }

  async upsert(
    collectionName: string,
    id: string,
    embedding: number[],
    document: string,
    metadata?: Record<string, string | number | boolean | null>,
  ): Promise<void> {
    const collection = await chromaClient.getOrCreateCollection({
      name: collectionName,
    });

    await collection.upsert({
      ids: [id],
      embeddings: [embedding],
      documents: [document],
      metadatas: metadata ? [metadata] : undefined,
    });
  }

  async upsertBatch(
    collectionName: string,
    ids: string[],
    embeddings: number[][],
    documents: string[],
    metadatas?: Record<string, string | number | boolean | null>[],
  ): Promise<void> {
    const collection = await chromaClient.getOrCreateCollection({
      name: collectionName,
    });

    const batchSize = Number(process.env.CHROMA_UPSERT_BATCH_SIZE ?? 256);

    for (let offset = 0; offset < ids.length; offset += batchSize) {
      const sliceIds = ids.slice(offset, offset + batchSize);
      const sliceEmbeddings = embeddings.slice(offset, offset + batchSize);
      const sliceDocuments = documents.slice(offset, offset + batchSize);
      const sliceMetadatas = metadatas
        ? metadatas.slice(offset, offset + batchSize)
        : undefined;

      const start = Date.now();
      await collection.upsert({
        ids: sliceIds,
        embeddings: sliceEmbeddings,
        documents: sliceDocuments,
        metadatas: sliceMetadatas,
      });
      const took = Date.now() - start;
      logger.debug(
        `[ChromaVectorStore] upsertBatch: offset=${offset} size=${sliceIds.length} took=${took}ms`,
      );
    }
  }

  async deleteCollection(name: string): Promise<void> {
    await chromaClient.deleteCollection({
      name,
    });
  }

  async delete(collectionName: string, ids: string[]): Promise<void> {
    const collection = await chromaClient.getOrCreateCollection({
      name: collectionName,
    });

    await collection.delete({ ids });
  }

  async deleteByMetadata(
    collectionName: string,
    filter: Record<string, unknown>,
  ): Promise<void> {
    const collection = await chromaClient.getOrCreateCollection({
      name: collectionName,
    });

    // Chroma supports deletion by a where/filter clause.
    // We pass the filter directly; if the client doesn't support it at runtime,
    // this will surface an error for further adjustment.
    await collection.delete({ where: filter as any });
  }

  async getCollectionCount(collectionName: string): Promise<number> {
    const collection = await chromaClient.getOrCreateCollection({
      name: collectionName,
    });

    // Try common JS client count method
    try {
      const anyCol: any = collection as any;
      if (typeof anyCol.count === "function") {
        const res = await anyCol.count();
        // some clients return { count: number }
        if (typeof res === "number") return res;
        if (res && typeof res.count === "number") return res.count;
      }
    } catch (e) {
      // fallthrough to safer approach
      logger.debug(
        "Chroma count() not available or failed:",
        (e as any)?.message ?? e,
      );
    }

    // Fallback: try list/query to estimate count. This is less efficient but works.
    try {
      const anyCol: any = collection as any;
      // If client supports get with include ids
      if (typeof anyCol.get === "function") {
        const res = await anyCol.get({ include: ["ids"], limit: 1e6 });
        const ids = res?.ids ?? [];
        if (Array.isArray(ids)) return ids.length;
      }
    } catch (e) {
      logger.debug("Chroma get fallback failed:", (e as any)?.message ?? e);
    }

    // As a last resort, return 0 to indicate unknown/empty
    return 0;
  }

  async search(
    collection: string,
    embedding: number[],
    limit = 5,
  ): Promise<SearchVectorResultDto[]> {
    const collectionName = await chromaClient.getOrCreateCollection({
      name: collection,
    });

    const result = await collectionName.query({
      queryEmbeddings: [embedding],
      nResults: limit,
    });

    const threshold = 0.25;

    const ids = result.ids?.[0] ?? [];
    const documents = result.documents?.[0] ?? [];
    const distances = result.distances?.[0] ?? [];
    const metadatas = result.metadatas?.[0] ?? [];

    const mapped = ids.map((id, index) => {
      const score = distances[index] ?? 0;
      return {
        id,
        document: documents[index] ?? "",
        score,
        metadata: metadatas[index] as Record<string, unknown>,
      } as SearchVectorResultDto;
    });

    return mapped.filter((r) => r.score >= threshold);
  }
}
