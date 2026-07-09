import { ChromaClient } from "chromadb";

import {
  SearchResult,
  VectorDocument,
  VectorStore,
} from "./vector-store.interface";

export class ChromaVectorStore implements VectorStore {
  private readonly client = new ChromaClient({
    path: process.env.CHROMA_URL,
  });

  async createCollection(name: string): Promise<void> {}

  async deleteCollection(name: string): Promise<void> {}

  async upsert(
    collection: string,
    documents: VectorDocument[],
  ): Promise<void> {}

  async search(
    collection: string,
    embedding: number[],
    limit = 5,
  ): Promise<SearchResult[]> {
    return [];
  }

  async delete(collection: string, ids: string[]): Promise<void> {}

  async health(): Promise<boolean> {
    return true;
  }
}
