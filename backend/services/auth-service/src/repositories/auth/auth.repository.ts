import { User }
  from "../../types/interfaces/auth.interface";

import {
  CreateUserInput,
  IUserRepository,
} from "../../types/interfaces/user.repository.interface";

export class AuthRepository
  implements IUserRepository
{
  private users: User[] = [];

  async findByEmail(
    email: string
  ): Promise<User | null> {
    return (
      this.users.find(
        u => u.email === email
      ) || null
    );
  }

  async findById(
    id: string
  ): Promise<User | null> {
    return (
      this.users.find(
        u => u.id === id
      ) || null
    );
  }

  async create(
    user: CreateUserInput
  ): Promise<User> {
    const newUser: User = {
      id: crypto.randomUUID(),
      ...user,
      emailVerified: false,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.users.push(newUser);

    return newUser;
  }

  async update(
    id: string,
    data: Partial<User>
  ): Promise<User> {
    const index = this.users.findIndex(
      u => u.id === id
    );

    if (index === -1) {
      throw new Error("User not found");
    }

    this.users[index] = {
      ...this.users[index],
      ...data,
      updatedAt: new Date(),
    };

    return this.users[index];
  }

  async delete(
    id: string
  ): Promise<void> {
    this.users = this.users.filter(
      u => u.id !== id
    );
  }
}

export const authRepository =
  new AuthRepository();