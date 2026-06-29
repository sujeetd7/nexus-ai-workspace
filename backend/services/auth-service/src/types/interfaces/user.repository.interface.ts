import { User } from "./auth.interface";

export interface CreateUserInput {
  email: string;

  passwordHash: string;

  firstName?: string;

  lastName?: string;
}

export interface IUserRepository {
  findById(
    id: string
  ): Promise<User | null>;

  findByEmail(
    email: string
  ): Promise<User | null>;

  create(
    user: CreateUserInput
  ): Promise<User>;

  update(
    id: string,
    data: Partial<User>
  ): Promise<User>;

  delete(
    id: string
  ): Promise<void>;
}