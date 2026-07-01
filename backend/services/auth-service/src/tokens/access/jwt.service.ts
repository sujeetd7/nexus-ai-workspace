import jwt from "jsonwebtoken";
import { JwtPayload } from "../../types/interfaces/auth.interface";

export class JwtService {
  private readonly accessSecret =
    process.env.JWT_ACCESS_SECRET || "development-secret";

  private readonly refreshSecret =
    process.env.JWT_REFRESH_SECRET || "development-refresh-secret";

  private readonly accessExpiry = "15m";

  private readonly refreshExpiry = "7d";

  generateAccessToken(payload: JwtPayload): string {
    console.log("SIGN ACCESS:", this.accessSecret);
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
    console.log("VERIFY ACCESS:", this.accessSecret);
    return jwt.verify(token, this.accessSecret) as JwtPayload;
  }

  generateRefreshToken(payload: JwtPayload): string {
    return jwt.sign(
      {
        sub: payload.sub,
        email: payload.email,
        role: payload.role,
      },
      this.refreshSecret,
      {
        expiresIn: this.refreshExpiry,
      },
    );
  }

  verifyRefreshToken(token: string): JwtPayload {
    return jwt.verify(token, this.refreshSecret) as JwtPayload;
  }
}

export const jwtService = new JwtService();
