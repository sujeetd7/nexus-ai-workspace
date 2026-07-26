import { SearchVectorResultDto } from "../dto/search-vector-result.dto";

export class CitationBuilder {
  static build(documents: SearchVectorResultDto[]) {
    return documents.map((doc) => ({
      id: doc.id,
      score: doc.score,
      metadata: doc.metadata,
    }));
  }
}
