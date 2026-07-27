import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { JwtPayload } from "../../types/interfaces/auth.interface";

export type TokenIdGenerator = () => string;

export class JwtService {
  private readonly accessSecret =
    process.env.JWT_ACCESS_SECRET || "development-secret";

  private readonly refreshSecret =
    process.env.JWT_REFRESH_SECRET || "development-refresh-secret";

  private readonly accessExpiry = "15m";

  private readonly refreshExpiry = "7d";

  constructor(
    private readonly tokenIdGenerator: TokenIdGenerator = randomUUID,
  ) {}

  generateAccessToken(payload: JwtPayload): string {
    return jwt.sign(
      {
        sub: payload.sub,
        email: payload.email,
        role: payload.role,
      },
      this.accessSecret,
      {
        expiresIn: this.accessExpiry,
      },
    );
  }

  verifyAccessToken(token: string): JwtPayload {
    return jwt.verify(token, this.accessSecret) as JwtPayload;
  }

  generateRefreshToken(payload: JwtPayload): string {
    return jwt.sign(
      {
        sub: payload.sub,
        email: payload.email,
        role: payload.role,
        jti: this.tokenIdGenerator(),
      },
      this.refreshSecret,
      {
        expiresIn: this.refreshExpiry,
      },
    );
  }

  verifyRefreshToken(token: string): JwtPayload {
    const payload = jwt.verify(token, this.refreshSecret) as JwtPayload;

    if (!payload.sub || !payload.jti) {
      throw new Error("INVALID_REFRESH_TOKEN_CLAIMS");
    }

    return payload;
  }
}

export const jwtService = new JwtService();
