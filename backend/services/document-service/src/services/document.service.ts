import { DocumentRepository } from "../repositories/document.repository";

export class DocumentService {
  private repository = new DocumentRepository();

  async create(data: any) {
    return this.repository.create(data);
  }

  async list() {
    return this.repository.findAll();
  }

  async get(id: string) {
    return this.repository.findById(id);
  }

  async update(id: string, data: any) {
    return this.repository.update(id, data);
  }

  async delete(id: string) {
    return this.repository.delete(id);
  }
}
