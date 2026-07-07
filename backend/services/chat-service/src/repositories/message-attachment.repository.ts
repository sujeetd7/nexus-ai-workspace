import { prisma } from "@config/database/prisma";

export class MessageAttachmentRepository {
  async create(data: any) {
    return prisma.messageAttachment.create({
      data,
    });
  }

  async findByMessage(messageId: string) {
    return prisma.messageAttachment.findMany({
      where: {
        messageId,
      },
    });
  }

  async delete(id: string) {
    return prisma.messageAttachment.delete({
      where: {
        id,
      },
    });
  }
}
