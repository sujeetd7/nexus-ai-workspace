import { prisma } from "../config/database/prisma";

export class AIExecutionRepository {
  create(data: any) {
    return prisma.aIExecution.create({
      data,
    });
  }
}
