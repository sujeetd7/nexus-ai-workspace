export interface VectorDocument {
  id: string;
  document: string;
  embedding: number[];
  metadata?: Record<string, unknown>;
}

export interface SearchResult {
  id: string;
  score: number;
  document: string;
  metadata?: Record<string, unknown>;
}

export interface VectorStore {
  createCollection(name: string): Promise<void>;

  deleteCollection(name: string): Promise<void>;

  upsert(collection: string, documents: VectorDocument[]): Promise<void>;

  search(
    collection: string,
    embedding: number[],
    limit?: number,
  ): Promise<SearchResult[]>;

  delete(collection: string, ids: string[]): Promise<void>;

  health(): Promise<boolean>;
}
