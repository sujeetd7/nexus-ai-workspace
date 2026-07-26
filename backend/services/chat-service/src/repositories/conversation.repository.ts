import { prisma } from "@config/database/prisma";

export class ConversationRepository {
  async create(data: any) {
    return prisma.conversation.create({ data });
  }

  async findAll() {
    return prisma.conversation.findMany({
      include: {
        members: true,
        messages: true,
      },
    });
  }

  async findById(id: string) {
    return prisma.conversation.findUnique({
      where: { id },
      include: {
        members: true,
        messages: true,
      },
    });
  }

  async update(id: string, data: any) {
    return prisma.conversation.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return prisma.conversation.delete({
      where: { id },
    });
  }
}
