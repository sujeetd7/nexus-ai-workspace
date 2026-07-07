import { prisma } from "@config/database/prisma";

export class MessageRepository {
  async create(data: any) {
    return prisma.message.create({
      data,
    });
  }

  async findByConversation(conversationId: string) {
    return prisma.message.findMany({
      where: {
        conversationId,
      },
      include: {
        attachments: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });
  }

  async delete(id: string) {
    return prisma.message.delete({
      where: {
        id,
      },
    });
  }
}
