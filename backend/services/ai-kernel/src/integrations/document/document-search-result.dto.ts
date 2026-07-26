import { DocumentDTO } from "./document.dto";

export interface DocumentSearchResultDTO {
  documents: DocumentDTO[];
  total: number;
  tookMs?: number;
}
