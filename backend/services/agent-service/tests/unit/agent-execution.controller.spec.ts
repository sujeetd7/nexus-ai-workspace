import { Request, Response } from "express";

import { AgentRuntimeController } from "../../src/controllers/agent-execution.controller";
import { AgentRuntimeService } from "../../src/services/agent-execution.service";
import { KernelUnavailableError } from "../../src/errors/kernel-unavailable-error";
import { errorHandler } from "../../src/middleware/error-handler";

jest.mock("../../src/services/agent-execution.service");

const MockedRuntimeService = AgentRuntimeService as jest.MockedClass<
  typeof AgentRuntimeService
>;

function mockRes() {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
}

describe("AgentRuntimeController.execute — normalized error envelope", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("delegates KernelUnavailableError to next (no stack in controller response)", async () => {
    const err = new KernelUnavailableError("AI Kernel is unavailable");
    MockedRuntimeService.prototype.execute.mockRejectedValue(err);

    const controller = new AgentRuntimeController();
    const req = { body: { agentId: "a1", variables: {} } } as Request;
    const res = mockRes();
    const next = jest.fn();

    await controller.execute(req, res, next);

    expect(res.json).not.toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(err);
  });

  it("errorHandler returns success:false without stack or details", () => {
    const err = new KernelUnavailableError("AI Kernel is unavailable");
    const req = {
      headers: { "x-correlation-id": "corr-1" },
    } as unknown as Request;
    const res = mockRes();

    errorHandler(err, req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: "KERNEL_UNAVAILABLE",
        message: "AI Kernel is unavailable",
        correlationId: "corr-1",
      },
    });

    const body = (res.json as jest.Mock).mock.calls[0][0];
    expect(body.success).toBe(false);
    expect(body.error.stack).toBeUndefined();
    expect(body.error.details).toBeUndefined();
    expect(JSON.stringify(body)).not.toMatch(/stack/i);
  });
});
