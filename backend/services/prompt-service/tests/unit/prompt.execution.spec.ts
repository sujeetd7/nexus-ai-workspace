import { PromptService } from "../../src/services/prompt.service";
import { PromptVersionRepository } from "../../src/repositories/prompt-version.repository";
import { PromptExecutionRepository } from "../../src/repositories/prompt-execution.repository";
import { AIServiceClient } from "../../src/clients/ai-service.client";

jest.mock("@config/database/prisma", () => ({ prisma: {} }));
jest.mock("../../src/repositories/prompt-version.repository");
jest.mock("../../src/repositories/prompt-execution.repository");
jest.mock("../../src/repositories/prompt.repository");
jest.mock("../../src/clients/ai-service.client");

const MockedVersionRepo = PromptVersionRepository as jest.MockedClass<
  typeof PromptVersionRepository
>;
const MockedExecutionRepo = PromptExecutionRepository as jest.MockedClass<
  typeof PromptExecutionRepository
>;
const MockedAIClient = AIServiceClient as jest.MockedClass<typeof AIServiceClient>;

const version = {
  id: "pv-1",
  systemPrompt: "You are helpful.",
  userPrompt: "Say hello to {{name}}",
  provider: "ollama",
  model: "llama3",
};

const aiResponse = {
  text: "Hello Ada",
  promptTokens: 5,
  completionTokens: 3,
  totalTokens: 8,
  durationMs: 42,
  provider: "ollama",
  model: "llama3",
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("PromptService.execute — singular execution persistence", () => {
  it("creates exactly one execution record on success", async () => {
    MockedVersionRepo.prototype.findById.mockResolvedValue(version as any);
    MockedAIClient.prototype.execute.mockResolvedValue(aiResponse as any);
    MockedExecutionRepo.prototype.create.mockResolvedValue({ id: "ex-1" } as any);

    const service = new PromptService();
    const result = await service.execute({
      promptVersionId: "pv-1",
      input: { name: "Ada" },
    });

    expect(result).toEqual(aiResponse);
    expect(MockedExecutionRepo.prototype.create).toHaveBeenCalledTimes(1);
    expect(MockedExecutionRepo.prototype.create).toHaveBeenCalledWith(
      expect.objectContaining({
        promptVersionId: "pv-1",
        output: aiResponse,
        tokens: 8,
        latency: 42,
      }),
    );
    expect(JSON.stringify(MockedExecutionRepo.prototype.create.mock.calls)).not.toContain(
      "Mock LLM Response",
    );
  });

  it("does not create an execution record when AI fails", async () => {
    MockedVersionRepo.prototype.findById.mockResolvedValue(version as any);
    MockedAIClient.prototype.execute.mockRejectedValue(
      new Error("AI service unreachable"),
    );

    const service = new PromptService();

    await expect(
      service.execute({
        promptVersionId: "pv-1",
        input: { name: "Ada" },
      }),
    ).rejects.toThrow("AI service unreachable");

    expect(MockedExecutionRepo.prototype.create).not.toHaveBeenCalled();
  });

  it("executeDirect does not persist an execution record", async () => {
    MockedAIClient.prototype.execute.mockResolvedValue(aiResponse as any);

    const service = new PromptService();
    const result = await service.executeDirect({ prompt: "Hello" });

    expect(result.text).toBe("Hello Ada");
    expect(MockedExecutionRepo.prototype.create).not.toHaveBeenCalled();
  });
});
