import { prisma } from "@config/database/prisma";
import { v4 as uuid } from "uuid";

// In-memory fallback when DB tables are not present (development)
const _workspaces = new Map<string, any>();

export class WorkspaceRepository {
  async create(data: {
    name: string;
    description?: string;
    ownerId: string;
    slug: string;
  }) {
    try {
      return await prisma.workspace.create({ data });
    } catch (err: any) {
      if (err?.message?.includes("does not exist")) {
        const id = uuid();
        const now = new Date();
        const record = {
          id,
          name: data.name,
          slug: data.slug,
          description: data.description || null,
          ownerId: data.ownerId,
          status: "ACTIVE",
          createdAt: now,
          updatedAt: now,
          members: [],
        };
        _workspaces.set(id, record);
        return record;
      }

      throw err;
    }
  }

  async findAll() {
    try {
      return await prisma.workspace.findMany();
    } catch (err: any) {
      if (err?.message?.includes("does not exist")) {
        return Array.from(_workspaces.values());
      }

      throw err;
    }
  }

  async findById(id: string) {
    try {
      return await prisma.workspace.findUnique({ where: { id } });
    } catch (err: any) {
      if (err?.message?.includes("does not exist")) {
        return _workspaces.get(id) ?? null;
      }

      throw err;
    }
  }

  async update(
    id: string,
    data: {
      name?: string;
      description?: string;
      status?: any;
    },
  ) {
    try {
      return await prisma.workspace.update({ where: { id }, data });
    } catch (err: any) {
      if (err?.message?.includes("does not exist")) {
        const existing = _workspaces.get(id);
        if (!existing) return null;
        const updated = { ...existing, ...data, updatedAt: new Date() };
        _workspaces.set(id, updated);
        return updated;
      }

      throw err;
    }
  }

  async delete(id: string) {
    try {
      return await prisma.workspace.delete({ where: { id } });
    } catch (err: any) {
      if (err?.message?.includes("does not exist")) {
        const existing = _workspaces.get(id);
        if (!existing) return null;
        _workspaces.delete(id);
        return existing;
      }

      throw err;
    }
  }
}
