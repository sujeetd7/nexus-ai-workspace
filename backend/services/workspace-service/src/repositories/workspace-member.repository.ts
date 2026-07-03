import { prisma } from "@config/database/prisma";
import { v4 as uuid } from "uuid";

// In-memory fallback stores
const _members = new Map<string, any>();
const _membersByWorkspace = new Map<string, Set<string>>();

export class WorkspaceMemberRepository {
  async create(data: { workspaceId: string; userId: string; role: any }) {
    try {
      return await prisma.workspaceMember.create({ data });
    } catch (err: any) {
      if (err?.message?.includes("does not exist")) {
        const id = uuid();
        const now = new Date();
        const record = {
          id,
          workspaceId: data.workspaceId,
          userId: data.userId,
          role: data.role,
          joinedAt: now,
        };
        _members.set(id, record);
        const set = _membersByWorkspace.get(data.workspaceId) ?? new Set();
        set.add(id);
        _membersByWorkspace.set(data.workspaceId, set);
        return record;
      }

      throw err;
    }
  }

  async findMembers(workspaceId: string) {
    try {
      return await prisma.workspaceMember.findMany({ where: { workspaceId } });
    } catch (err: any) {
      if (err?.message?.includes("does not exist")) {
        const ids = _membersByWorkspace.get(workspaceId) ?? new Set();
        return Array.from(ids).map((id) => _members.get(id));
      }

      throw err;
    }
  }

  // GET /workspaces/:workspaceId/members/:memberId
  async findMember(workspaceId: string, memberId: string) {
    try {
      return await prisma.workspaceMember.findFirst({
        where: { id: memberId, workspaceId },
      });
    } catch (err: any) {
      if (err?.message?.includes("does not exist")) {
        const m = _members.get(memberId) ?? null;
        if (!m) return null;
        return m.workspaceId === workspaceId ? m : null;
      }

      throw err;
    }
  }

  async findByUser(workspaceId: string, userId: string) {
    try {
      return await prisma.workspaceMember.findFirst({
        where: { workspaceId, userId },
      });
    } catch (err: any) {
      if (err?.message?.includes("does not exist")) {
        const ids = _membersByWorkspace.get(workspaceId) ?? new Set();
        for (const id of ids) {
          const m = _members.get(id);
          if (m && m.userId === userId) return m;
        }
        return null;
      }

      throw err;
    }
  }

  // PATCH /workspaces/:workspaceId/members/:memberId
  async updateRole(workspaceId: string, memberId: string, role: any) {
    try {
      const member = await prisma.workspaceMember.findFirst({
        where: { id: memberId, workspaceId },
      });

      if (!member) return null;

      return await prisma.workspaceMember.update({
        where: { id: memberId },
        data: { role },
      });
    } catch (err: any) {
      if (err?.message?.includes("does not exist")) {
        const m = _members.get(memberId);
        if (!m || m.workspaceId !== workspaceId) return null;
        const updated = { ...m, role };
        _members.set(memberId, updated);
        return updated;
      }

      throw err;
    }
  }

  // DELETE /workspaces/:workspaceId/members/:memberId
  async delete(workspaceId: string, memberId: string) {
    try {
      const member = await prisma.workspaceMember.findFirst({
        where: { id: memberId, workspaceId },
      });

      if (!member) return null;

      return await prisma.workspaceMember.delete({ where: { id: memberId } });
    } catch (err: any) {
      if (err?.message?.includes("does not exist")) {
        const m = _members.get(memberId);
        if (!m || m.workspaceId !== workspaceId) return null;
        _members.delete(memberId);
        const set = _membersByWorkspace.get(workspaceId);
        if (set) {
          set.delete(memberId);
          _membersByWorkspace.set(workspaceId, set);
        }
        return m;
      }

      throw err;
    }
  }
}
