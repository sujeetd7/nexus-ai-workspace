import { v4 as uuid } from "uuid";

import { WorkspaceRepository } from "../repositories/workspace.repository";

export class WorkspaceService {
  constructor(private repository = new WorkspaceRepository()) {}

  async create(data: { name: string; description?: string; ownerId: string }) {
    return this.repository.create({
      ...data,

      slug: `${data.name.toLowerCase().replace(/\s+/g, "-")}-${uuid().slice(
        0,
        6,
      )}`,
    });
  }

  async list(userId: string) {
    return this.repository.findAccessibleByUserId(userId);
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
