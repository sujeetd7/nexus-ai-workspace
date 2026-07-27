import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var -- required for global Prisma singleton augmentation
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ??
  new PrismaClient({
    log: ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}
