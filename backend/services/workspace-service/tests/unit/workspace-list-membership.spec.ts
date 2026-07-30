/**
 * Batch 5D.1-R1 — membership-scoped workspace listing.
 */
jest.mock("uuid", () => ({
  v4: () => "00000000-0000-4000-8000-000000000001",
}));

import * as jwt from "jsonwebtoken";
import { WorkspaceController } from "../../src/controllers/workspace.controller";
import { WorkspaceService } from "../../src/services/workspace.service";
import { WorkspaceRepository } from "../../src/repositories/workspace.repository";
import { authenticate } from "../../src/middleware/auth/authenticate.middleware";
import { prisma } from "../../src/config/database/prisma";

jest.mock("../../src/config/database/prisma", () => ({
  prisma: {
    workspace: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;

describe("Workspace list — membership scoping (5D.1-R1)", () => {
  const secret = "development-secret";

  beforeAll(() => {
    process.env.JWT_ACCESS_SECRET = secret;
  });

  beforeEach(() => jest.clearAllMocks());

  function mockRes() {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  }

  it("repository filters by ownerId or membership", async () => {
    const rows = [{ id: "ws-owned" }, { id: "ws-member" }];
    (mockedPrisma.workspace.findMany as jest.Mock).mockResolvedValue(rows);

    const repo = new WorkspaceRepository();
    const result = await repo.findAccessibleByUserId("user-a");

    expect(result).toEqual(rows);
    expect(mockedPrisma.workspace.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { ownerId: "user-a" },
          { members: { some: { userId: "user-a" } } },
        ],
      },
    });
  });

  it("empty membership returns empty collection", async () => {
    (mockedPrisma.workspace.findMany as jest.Mock).mockResolvedValue([]);
    const service = new WorkspaceService(new WorkspaceRepository());

    await expect(service.list("user-none")).resolves.toEqual([]);
  });

  it("controller returns 401 when identity is missing", async () => {
    const controller = new WorkspaceController();
    const req: any = { headers: {} };
    const res = mockRes();

    await controller.list(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
  });

  it("controller lists only caller's accessible workspaces", async () => {
    const accessible = [
      {
        id: "ws-1",
        name: "Mine",
        slug: "mine",
        ownerId: "user-a",
        status: "ACTIVE",
      },
    ];
    (mockedPrisma.workspace.findMany as jest.Mock).mockResolvedValue(accessible);

    const token = jwt.sign({ sub: "user-a", role: "DEVELOPER" }, secret);
    const req: any = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    const next = jest.fn(() => undefined);

    authenticate(req, res, next);
    expect(next).toHaveBeenCalled();

    const controller = new WorkspaceController();
    await controller.list(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(accessible);
    expect(mockedPrisma.workspace.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { ownerId: "user-a" },
          { members: { some: { userId: "user-a" } } },
        ],
      },
    });
  });

  it("non-member query does not use unscoped findAll", async () => {
    (mockedPrisma.workspace.findMany as jest.Mock).mockResolvedValue([]);
    const repo = new WorkspaceRepository();

    await repo.findAccessibleByUserId("outsider");

    const call = (mockedPrisma.workspace.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where).toBeDefined();
    expect(call.where.OR).toHaveLength(2);
  });

  it("create seeds OWNER membership for the owner", async () => {
    (mockedPrisma.workspace.create as jest.Mock).mockResolvedValue({
      id: "ws-new",
      name: "New",
      ownerId: "user-a",
    });

    const repo = new WorkspaceRepository();
    await repo.create({
      name: "New",
      slug: "new-abc",
      ownerId: "user-a",
    });

    expect(mockedPrisma.workspace.create).toHaveBeenCalledWith({
      data: {
        name: "New",
        slug: "new-abc",
        ownerId: "user-a",
        members: {
          create: {
            userId: "user-a",
            role: "OWNER",
          },
        },
      },
    });
  });

  it("authenticate rejects unauthenticated list callers", () => {
    const req: any = { headers: {} };
    const res = mockRes();
    const next = jest.fn();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
