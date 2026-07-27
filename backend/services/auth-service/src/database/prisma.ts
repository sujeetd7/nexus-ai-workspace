import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var -- required for global Prisma singleton augmentation
  var prisma: PrismaClient | undefined;
}
console.log("DATABASE_URL =", process.env.DATABASE_URL);

export const prisma =
  global.prisma ??
  new PrismaClient({
    log: ["query", "warn", "error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}
