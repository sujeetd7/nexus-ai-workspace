import { UserRepository } from "../repositories/user.repository";

export class UserService {
  private repository = new UserRepository();

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
