import { prisma } from "@config/database/prisma";

export class ConversationMemberRepository {
  async create(data: any) {
    return prisma.conversationMember.create({
      data,
    });
  }

  async findByConversation(conversationId: string) {
    return prisma.conversationMember.findMany({
      where: {
        conversationId,
      },
    });
  }

  async delete(id: string) {
    return prisma.conversationMember.delete({
      where: {
        id,
      },
    });
  }
}
