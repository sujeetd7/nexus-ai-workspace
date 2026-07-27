import { AgentRuntimeService } from "../../src/services/agent-execution.service";
import { AIKernelClient } from "../../src/clients/ai-kernel.client";
import { AgentRepository } from "../../src/repositories/agent.repository";
import { AgentRuntimeRepository } from "../../src/repositories/agent-execution.repository";
import { KernelUnavailableError } from "../../src/errors/kernel-unavailable-error";

jest.mock("../../src/clients/ai-kernel.client");
jest.mock("../../src/repositories/agent.repository");
jest.mock("../../src/repositories/agent-execution.repository");

const MockedKernelClient = AIKernelClient as jest.MockedClass<typeof AIKernelClient>;
const MockedAgentRepo = AgentRepository as jest.MockedClass<typeof AgentRepository>;
const MockedRuntimeRepo = AgentRuntimeRepository as jest.MockedClass<typeof AgentRuntimeRepository>;

function makeService() {
  return new AgentRuntimeService();
}

const fakeAgent = {
  id: "agent-1",
  name: "Test Agent",
  systemPrompt: "Hello {{name}}",
  provider: "openai",
  model: "gpt-4",
  temperature: 0.7,
};

const fakeExecution = {
  id: "exec-1",
  agentId: "agent-1",
  provider: "openai",
  model: "gpt-4",
  input: {},
  output: { text: "Hi Alice" },
  latency: 120,
  tokens: 20,
  status: "SUCCESS",
  error: null,
  createdAt: new Date(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("AgentRuntimeService.execute", () => {
  it("persists SUCCESS execution and returns it when kernel succeeds", async () => {
    MockedAgentRepo.prototype.findById.mockResolvedValue(fakeAgent as any);
    MockedKernelClient.prototype.execute.mockResolvedValue({
      output: { text: "Hi Alice" },
      latency: 120,
      tokens: 20,
    });
    MockedRuntimeRepo.prototype.create.mockResolvedValue(fakeExecution as any);

    const service = makeService();
    const result = await service.execute({ agentId: "agent-1", variables: { name: "Alice" } });

    expect(result.status).toBe("SUCCESS");
    expect(MockedRuntimeRepo.prototype.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: "SUCCESS" }),
    );
  });

  it("persists FAILED execution and rethrows when kernel fails — no mock success", async () => {
    MockedAgentRepo.prototype.findById.mockResolvedValue(fakeAgent as any);
    const kernelError = new KernelUnavailableError(
      "AI Kernel connection failed. No response received.",
    );
    MockedKernelClient.prototype.execute.mockRejectedValue(kernelError);
    MockedRuntimeRepo.prototype.create.mockResolvedValue({
      ...fakeExecution,
      status: "FAILED",
    } as any);

    const service = makeService();

    await expect(
      service.execute({ agentId: "agent-1", variables: { name: "Alice" } }),
    ).rejects.toThrow(KernelUnavailableError);

    expect(MockedRuntimeRepo.prototype.create).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "FAILED",
        error: "AI Kernel connection failed. No response received.",
      }),
    );

    const callArg = MockedRuntimeRepo.prototype.create.mock.calls[0][0];
    expect(callArg.output).toBeNull();
  });

  it("throws NotFoundError when agent does not exist", async () => {
    MockedAgentRepo.prototype.findById.mockResolvedValue(null);

    const service = makeService();

    await expect(
      service.execute({ agentId: "missing", variables: {} }),
    ).rejects.toThrow("Agent not found.");

    expect(MockedRuntimeRepo.prototype.create).not.toHaveBeenCalled();
  });
});
