import { WorkspaceInvitationController } from "../../src/controllers/workspace-invitation.controller";
import { WorkspaceInvitationService } from "../../src/services/workspace-invitation.service";

jest.mock("../../src/services/workspace-invitation.service");

const MockedService = WorkspaceInvitationService as jest.MockedClass<
  typeof WorkspaceInvitationService
>;

function mockRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe("WorkspaceInvitationController.accept identity (W3)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("uses verified subject and ignores body.userId override", async () => {
    MockedService.prototype.acceptInvitation.mockResolvedValue({
      id: "inv-1",
      status: "ACCEPTED",
    } as any);

    const controller = new WorkspaceInvitationController();
    const req: any = {
      auth: { userId: "verified-user", email: "bob@example.com" },
      body: {
        token: "token-abc",
        userId: "attacker-override",
        email: "bob@example.com",
      },
    };
    const res = mockRes();

    await controller.accept(req, res);

    expect(MockedService.prototype.acceptInvitation).toHaveBeenCalledWith(
      "token-abc",
      "verified-user",
      "bob@example.com",
    );
    expect(MockedService.prototype.acceptInvitation).not.toHaveBeenCalledWith(
      expect.anything(),
      "attacker-override",
      expect.anything(),
    );
    expect(res.json).toHaveBeenCalled();
  });

  it("returns 401 when authentication context is missing", async () => {
    const controller = new WorkspaceInvitationController();
    const req: any = {
      body: { token: "token-abc", userId: "only-in-body" },
    };
    const res = mockRes();

    await controller.accept(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(MockedService.prototype.acceptInvitation).not.toHaveBeenCalled();
  });

  it("returns 403 on invitation identity mismatch", async () => {
    MockedService.prototype.acceptInvitation.mockRejectedValue(
      new Error(
        "Invitation identity mismatch: email does not match this invitation",
      ),
    );

    const controller = new WorkspaceInvitationController();
    const req: any = {
      auth: { userId: "verified-user", email: "wrong@example.com" },
      body: { token: "token-abc", email: "wrong@example.com" },
    };
    const res = mockRes();

    await controller.accept(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });
});
