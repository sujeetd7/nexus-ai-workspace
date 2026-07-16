import { SearchVectorResultDto } from "../dto/search-vector-result.dto";

export interface VectorRecord {
  id: string;

  embedding: number[];

  document: string;

  metadata?: Record<string, unknown>;
}

export interface VectorStore {
  createCollection(name: string): Promise<void>;

  deleteCollection(name: string): Promise<void>;

  upsert(
    collection: string,
    id: string,
    embedding: number[],
    document: string,
    metadata?: Record<string, unknown>,
  ): Promise<void>;

  upsertBatch(
    collectionName: string,
    ids: string[],
    embeddings: number[][],
    documents: string[],
    metadatas?: Record<string, string | number | boolean | null>[],
  ): Promise<void>;

  search(
    collection: string,
    embedding: number[],
    limit: number,
  ): Promise<SearchVectorResultDto[]>;

  delete(collection: string, ids: string[]): Promise<void>;

  deleteByMetadata(
    collection: string,
    filter: Record<string, unknown>,
  ): Promise<void>;

  getCollectionCount(collection: string): Promise<number>;

  health(): Promise<boolean>;
}
