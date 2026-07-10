import { SearchVectorResultDto } from "../dto/search-vector-result.dto";

export class ContextBuilder {
  static build(documents: SearchVectorResultDto[]): string {
    if (!documents.length) {
      return "";
    }

    return documents
      .map((doc, index) => {
        return `Source ${index + 1}

${doc.document}`;
      })
      .join("\n\n-------------------------\n\n");
  }
}
