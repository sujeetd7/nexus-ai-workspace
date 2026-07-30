import { prisma } from "@config/database/prisma";

export class WorkspaceRepository {
  async create(data: {
    name: string;
    description?: string;
    ownerId: string;
    slug: string;
  }) {
    return prisma.workspace.create({
      data: {
        ...data,
        members: {
          create: {
            userId: data.ownerId,
            role: "OWNER",
          },
        },
      },
    });
  }

  async findAll() {
    return prisma.workspace.findMany();
  }

  /**
   * Membership-scoped listing: workspaces the user owns or is a member of.
   * Includes `ownerId` so legacy owner-only rows (no member row) remain visible.
   */
  async findAccessibleByUserId(userId: string) {
    return prisma.workspace.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
        ],
      },
    });
  }

  async findById(id: string) {
    return prisma.workspace.findUnique({ where: { id } });
  }

  async update(
    id: string,
    data: {
      name?: string;
      description?: string;
      status?: any;
    },
  ) {
    return prisma.workspace.update({ where: { id }, data });
  }

  async delete(id: string) {
    return prisma.workspace.delete({ where: { id } });
  }
}
