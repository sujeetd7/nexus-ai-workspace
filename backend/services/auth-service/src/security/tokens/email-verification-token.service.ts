import crypto from "crypto";

import { hashService } from "../hash/hash.service";

export class EmailVerificationTokenService {
  generate(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  hash(token: string): string {
    return hashService.sha256(token);
  }

  compare(rawToken: string, hashedToken: string): boolean {
    return this.hash(rawToken) === hashedToken;
  }
}

export const emailVerificationTokenService =
  new EmailVerificationTokenService();
