import { ChromaVectorStore } from "../vector/chroma-vector-store";

export class VectorRepository {
  private readonly store =
    new ChromaVectorStore();

  async save(...) {}

  async search(...) {}

  async delete(...) {}
}