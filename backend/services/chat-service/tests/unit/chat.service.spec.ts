import { ChatService, ChatServiceError } from "../../src/services/chat.service";
import { PromptServiceHttpClient } from "../../src/clients/prompt-service.client";
import { MessageRepository } from "../../src/repositories/message.repository";

jest.mock("../../src/clients/prompt-service.client");
jest.mock("../../src/repositories/message.repository");
jest.mock("../../src/repositories/conversation.repository");
jest.mock("../../src/repositories/conversation-member.repository");
jest.mock("../../src/repositories/message-attachment.repository");

const MockedPromptClient = PromptServiceHttpClient as jest.MockedClass<
  typeof PromptServiceHttpClient
>;
const MockedMessageRepo = MessageRepository as jest.MockedClass<
  typeof MessageRepository
>;

beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.PROMPT_SERVICE_URL;
  delete process.env.AI_SERVICE_URL;
});

describe("ChatService.sendMessage — Prompt Service ownership", () => {
  const conversationId = "conv-1";
  const senderId = "user-1";
  const content = "Hello AI";

  const fakeUserMessage = {
    id: "msg-1",
    conversationId,
    senderId,
    type: "USER",
    content,
  };
  const fakeAssistantMessage = {
    id: "msg-2",
    conversationId,
    senderId: "assistant",
    type: "ASSISTANT",
    content: "Hi there!",
  };

  it("persists user message, calls Prompt Service executeDirect, persists assistant", async () => {
    MockedMessageRepo.prototype.create
      .mockResolvedValueOnce(fakeUserMessage as any)
      .mockResolvedValueOnce(fakeAssistantMessage as any);

    MockedPromptClient.prototype.executeDirect = jest.fn().mockResolvedValue({
      text: "Hi there!",
      totalTokens: 10,
      durationMs: 100,
      provider: "ollama",
      model: "llama3",
    });

    const service = new ChatService();
    const result = await service.sendMessage({
      conversationId,
      senderId,
      content,
    });

    expect(result.userMessage).toEqual(fakeUserMessage);
    expect(result.assistantMessage).toEqual(fakeAssistantMessage);
    expect(MockedMessageRepo.prototype.create).toHaveBeenCalledTimes(2);
    expect(MockedPromptClient.prototype.executeDirect).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: content, userId: senderId }),
      expect.any(Object),
    );
    expect(MockedPromptClient.prototype.execute).not.toHaveBeenCalled();
    expect(MockedMessageRepo.prototype.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ type: "USER", content }),
    );
    expect(MockedMessageRepo.prototype.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ type: "ASSISTANT", content: "Hi there!" }),
    );
  });

  it("uses Prompt execute when promptVersionId is provided", async () => {
    MockedMessageRepo.prototype.create
      .mockResolvedValueOnce(fakeUserMessage as any)
      .mockResolvedValueOnce(fakeAssistantMessage as any);

    MockedPromptClient.prototype.execute = jest.fn().mockResolvedValue({
      text: "Versioned reply",
      totalTokens: 5,
      durationMs: 50,
    });

    const service = new ChatService();
    await service.sendMessage({
      conversationId,
      senderId,
      content,
      promptVersionId: "pv-1",
      variables: { name: "Ada" },
    });

    expect(MockedPromptClient.prototype.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        promptVersionId: "pv-1",
        input: { name: "Ada" },
      }),
      expect.any(Object),
    );
    expect(MockedPromptClient.prototype.executeDirect).not.toHaveBeenCalled();
  });

  it("does not call AI Service — Prompt client is the only upstream", async () => {
    MockedMessageRepo.prototype.create
      .mockResolvedValueOnce(fakeUserMessage as any)
      .mockResolvedValueOnce(fakeAssistantMessage as any);
    MockedPromptClient.prototype.executeDirect = jest.fn().mockResolvedValue({
      text: "ok",
      totalTokens: 1,
      durationMs: 1,
    });

    const service = new ChatService();
    await service.sendMessage({ conversationId, senderId, content });

    // No AI client on ChatService; Prompt client was invoked once.
    expect(MockedPromptClient.prototype.executeDirect).toHaveBeenCalledTimes(1);
    expect((service as any).aiClient).toBeUndefined();
  });

  it("on Prompt failure: user message may remain; assistant is not persisted; no fabricated output", async () => {
    MockedMessageRepo.prototype.create.mockResolvedValueOnce(
      fakeUserMessage as any,
    );
    MockedPromptClient.prototype.executeDirect = jest
      .fn()
      .mockRejectedValue(new ChatServiceError("Prompt service unreachable"));

    const service = new ChatService();

    await expect(
      service.sendMessage({ conversationId, senderId, content }),
    ).rejects.toThrow(ChatServiceError);

    expect(MockedMessageRepo.prototype.create).toHaveBeenCalledTimes(1);
    expect(MockedMessageRepo.prototype.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: "USER" }),
    );
  });

  it("throws when PROMPT_SERVICE_URL missing via client — no silent AI fallback", async () => {
    MockedMessageRepo.prototype.create.mockResolvedValueOnce(
      fakeUserMessage as any,
    );
    MockedPromptClient.prototype.executeDirect = jest
      .fn()
      .mockImplementation(() => {
        throw new ChatServiceError("PROMPT_SERVICE_URL is not configured");
      });

    const service = new ChatService();

    await expect(
      service.sendMessage({ conversationId, senderId, content }),
    ).rejects.toThrow("PROMPT_SERVICE_URL is not configured");

    expect(MockedMessageRepo.prototype.create).toHaveBeenCalledTimes(1);
  });
});
