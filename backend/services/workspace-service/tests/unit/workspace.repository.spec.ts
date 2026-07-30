/**
 * Regression: WorkspaceRepository must not fall back to an in-memory Map
 * when Prisma throws. All DB errors must propagate.
 */
import { WorkspaceRepository } from "../../src/repositories/workspace.repository";
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

beforeEach(() => jest.clearAllMocks());

describe("WorkspaceRepository — no silent memory fallback", () => {
  const dbError = new Error('relation "Workspace" does not exist');

  it("create: propagates DB error without switching to memory", async () => {
    (mockedPrisma.workspace.create as jest.Mock).mockRejectedValue(dbError);
    const repo = new WorkspaceRepository();

    await expect(
      repo.create({ name: "W1", slug: "w1", ownerId: "u1" }),
    ).rejects.toThrow(dbError);
  });

  it("findAll: propagates DB error without switching to memory", async () => {
    (mockedPrisma.workspace.findMany as jest.Mock).mockRejectedValue(dbError);
    const repo = new WorkspaceRepository();

    await expect(repo.findAll()).rejects.toThrow(dbError);
  });

  it("findAccessibleByUserId: propagates DB error without switching to memory", async () => {
    (mockedPrisma.workspace.findMany as jest.Mock).mockRejectedValue(dbError);
    const repo = new WorkspaceRepository();

    await expect(repo.findAccessibleByUserId("user-1")).rejects.toThrow(dbError);
  });

  it("findById: propagates DB error without switching to memory", async () => {
    (mockedPrisma.workspace.findUnique as jest.Mock).mockRejectedValue(dbError);
    const repo = new WorkspaceRepository();

    await expect(repo.findById("some-id")).rejects.toThrow(dbError);
  });

  it("update: propagates DB error without switching to memory", async () => {
    (mockedPrisma.workspace.update as jest.Mock).mockRejectedValue(dbError);
    const repo = new WorkspaceRepository();

    await expect(repo.update("some-id", { name: "New" })).rejects.toThrow(dbError);
  });

  it("delete: propagates DB error without switching to memory", async () => {
    (mockedPrisma.workspace.delete as jest.Mock).mockRejectedValue(dbError);
    const repo = new WorkspaceRepository();

    await expect(repo.delete("some-id")).rejects.toThrow(dbError);
  });
});
