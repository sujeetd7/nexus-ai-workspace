import crypto from "crypto";

export class SecureTokenService {
  generateUrlSafeToken(byteLength = 32): string {
    return crypto.randomBytes(byteLength).toString("base64url");
  }
}

export const secureTokenService = new SecureTokenService();
