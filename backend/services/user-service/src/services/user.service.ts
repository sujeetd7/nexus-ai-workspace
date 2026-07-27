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

  async getByAuthUserId(authUserId: string) {
    return this.repository.findByAuthUserId(authUserId);
  }

  async update(id: string, data: any) {
    return this.repository.update(id, data);
  }

  async updateByAuthUserId(authUserId: string, data: any) {
    const profile = await this.repository.findByAuthUserId(authUserId);

    if (!profile) {
      return null;
    }

    return this.repository.update(profile.id, data);
  }

  async delete(id: string) {
    return this.repository.delete(id);
  }
}
