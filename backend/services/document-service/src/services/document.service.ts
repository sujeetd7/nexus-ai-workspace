import {
  CreateDocumentDto,
  ListDocumentsDto,
  UpdateDocumentDto,
} from "../dto/document.dto";
import { DocumentRepository } from "../repositories/document.repository";

export class DocumentService {
  private readonly repository = new DocumentRepository();

  async create(data: CreateDocumentDto) {
    return this.repository.create(data);
  }

  async list(filter: ListDocumentsDto = {}) {
    return this.repository.findAll(filter);
  }

  async get(id: string) {
    return this.repository.findById(id);
  }

  async update(id: string, data: UpdateDocumentDto) {
    return this.repository.update(id, data);
  }

  async delete(id: string) {
    return this.repository.delete(id);
  }
}
