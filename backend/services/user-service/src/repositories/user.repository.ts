import { prisma } from "@config/database/prisma";

export class UserRepository {
  async create(data: any) {
    return prisma.userProfile.create({
      data,
    });
  }

  async findAll() {
    return prisma.userProfile.findMany();
  }

  async findById(id: string) {
    return prisma.userProfile.findUnique({
      where: {
        id,
      },
    });
  }

  async findByAuthUserId(authUserId: string) {
    return prisma.userProfile.findUnique({
      where: {
        authUserId,
      },
    });
  }

  async update(id: string, data: any) {
    return prisma.userProfile.update({
      where: {
        id,
      },
      data,
    });
  }

  async delete(id: string) {
    return prisma.userProfile.delete({
      where: {
        id,
      },
    });
  }
}
