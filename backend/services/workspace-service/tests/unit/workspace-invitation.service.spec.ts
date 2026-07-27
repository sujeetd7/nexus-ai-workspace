import { WorkspaceInvitationService } from "../../src/services/workspace-invitation.service";
import { WorkspaceInvitationRepository } from "../../src/repositories/workspace-invitation.repository";
import { prisma } from "../../src/config/database/prisma";

jest.mock("../../src/repositories/workspace-invitation.repository");
jest.mock("../../src/config/database/prisma", () => ({
  prisma: {
    $transaction: jest.fn(),
    workspaceMember: { create: jest.fn() },
    workspaceInvitation: { update: jest.fn() },
  },
}));

const MockedInvitationRepo = WorkspaceInvitationRepository as jest.MockedClass<
  typeof WorkspaceInvitationRepository
>;
const mockedPrisma = prisma as jest.Mocked<typeof prisma>;

const pendingInvitation = {
  id: "inv-1",
  workspaceId: "ws-1",
  email: "bob@example.com",
  invitedBy: "alice-id",
  role: "MEMBER" as const,
  status: "PENDING" as const,
  token: "token-abc",
  expiresAt: new Date(Date.now() + 86_400_000),
  createdAt: new Date(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("WorkspaceInvitationService.acceptInvitation", () => {
  it("creates WorkspaceMember and marks invitation ACCEPTED in a transaction", async () => {
    MockedInvitationRepo.prototype.findByToken.mockResolvedValue(pendingInvitation as any);

    const createdMember = { id: "mem-1", workspaceId: "ws-1", userId: "bob-id", role: "MEMBER" };
    const updatedInvitation = { ...pendingInvitation, status: "ACCEPTED" };

    (mockedPrisma.$transaction as jest.Mock).mockImplementation(async (fn) => {
      const tx = {
        workspaceMember: { create: jest.fn().mockResolvedValue(createdMember) },
        workspaceInvitation: { update: jest.fn().mockResolvedValue(updatedInvitation) },
      };
      return fn(tx);
    });

    const service = new WorkspaceInvitationService();
    const result = await service.acceptInvitation("token-abc", "bob-id");

    expect(result.status).toBe("ACCEPTED");

    // Confirm transaction was used — no partial update possible
    expect(mockedPrisma.$transaction).toHaveBeenCalledTimes(1);

    // Confirm member creation was called inside transaction with correct data
    const txCall = (mockedPrisma.$transaction as jest.Mock).mock.calls[0][0];
    const fakeTx = {
      workspaceMember: { create: jest.fn().mockResolvedValue(createdMember) },
      workspaceInvitation: { update: jest.fn().mockResolvedValue(updatedInvitation) },
    };
    await txCall(fakeTx);
    expect(fakeTx.workspaceMember.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ workspaceId: "ws-1", userId: "bob-id" }),
    });
  });

  it("throws when invitation is not found", async () => {
    MockedInvitationRepo.prototype.findByToken.mockResolvedValue(null);
    const service = new WorkspaceInvitationService();

    await expect(service.acceptInvitation("bad-token", "user-1")).rejects.toThrow(
      "Invitation not found",
    );
    expect(mockedPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("throws when invitation is expired — invitation stays PENDING", async () => {
    const expired = { ...pendingInvitation, expiresAt: new Date(Date.now() - 1000) };
    MockedInvitationRepo.prototype.findByToken.mockResolvedValue(expired as any);

    const service = new WorkspaceInvitationService();
    await expect(service.acceptInvitation("token-abc", "user-1")).rejects.toThrow(
      "Invitation expired",
    );
    expect(mockedPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("throws when already accepted", async () => {
    const accepted = { ...pendingInvitation, status: "ACCEPTED" };
    MockedInvitationRepo.prototype.findByToken.mockResolvedValue(accepted as any);

    const service = new WorkspaceInvitationService();
    await expect(service.acceptInvitation("token-abc", "user-1")).rejects.toThrow(
      "Invitation already accepted",
    );
    expect(mockedPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("throws when userId is empty", async () => {
    const service = new WorkspaceInvitationService();
    await expect(service.acceptInvitation("token-abc", "")).rejects.toThrow(
      "userId is required",
    );
  });

  it("rejects when supplied email does not match invitation email", async () => {
    MockedInvitationRepo.prototype.findByToken.mockResolvedValue(
      pendingInvitation as any,
    );
    const service = new WorkspaceInvitationService();

    await expect(
      service.acceptInvitation("token-abc", "bob-id", "eve@example.com"),
    ).rejects.toThrow("Invitation identity mismatch");
    expect(mockedPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("accepts when supplied email matches invitation email (case-insensitive)", async () => {
    MockedInvitationRepo.prototype.findByToken.mockResolvedValue(
      pendingInvitation as any,
    );
    const updatedInvitation = { ...pendingInvitation, status: "ACCEPTED" };

    (mockedPrisma.$transaction as jest.Mock).mockImplementation(async (fn) => {
      const tx = {
        workspaceMember: {
          create: jest.fn().mockResolvedValue({ id: "mem-1" }),
        },
        workspaceInvitation: {
          update: jest.fn().mockResolvedValue(updatedInvitation),
        },
      };
      return fn(tx);
    });

    const service = new WorkspaceInvitationService();
    const result = await service.acceptInvitation(
      "token-abc",
      "bob-id",
      "Bob@Example.com",
    );

    expect(result.status).toBe("ACCEPTED");
    expect(mockedPrisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it("does not create member if transaction fails — invitation remains PENDING", async () => {
    MockedInvitationRepo.prototype.findByToken.mockResolvedValue(pendingInvitation as any);
    (mockedPrisma.$transaction as jest.Mock).mockRejectedValue(
      new Error("unique constraint violation"),
    );

    const service = new WorkspaceInvitationService();
    await expect(service.acceptInvitation("token-abc", "bob-id")).rejects.toThrow(
      "unique constraint violation",
    );
  });
});
