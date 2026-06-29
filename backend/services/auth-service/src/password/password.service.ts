import bcrypt from "bcrypt";

export class PasswordService {
  private readonly rounds = 12;

  async hash(
    password: string
  ): Promise<string> {
    return bcrypt.hash(
      password,
      this.rounds
    );
  }

  async verify(
    password: string,
    hash: string
  ): Promise<boolean> {
    return bcrypt.compare(
      password,
      hash
    );
  }
}

export const passwordService =
  new PasswordService();