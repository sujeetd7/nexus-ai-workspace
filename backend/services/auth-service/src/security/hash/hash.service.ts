import crypto from "crypto";

export class HashService {
  sha256(value: string): string {
    return crypto.createHash("sha256").update(value).digest("hex");
  }
}

export const hashService = new HashService();
