import crypto from "crypto";

import { hashService } from "../hash/hash.service";

export class PasswordResetTokenService {
  generate() {
    return crypto.randomBytes(32).toString("hex");
  }

  hash(token: string) {
    return hashService.sha256(token);
  }
}

export const passwordResetTokenService = new PasswordResetTokenService();
