import dotenv from "dotenv";

dotenv.config();

export const env = {
  PORT: Number(process.env.PORT || 3002),

  DATABASE_URL: process.env.DATABASE_URL || "",

  /**
   * Same access-token secret as Auth Service / Gateway (JWT_ACCESS_SECRET).
   */
  JWT_ACCESS_SECRET:
    process.env.JWT_ACCESS_SECRET || "development-secret",
};
