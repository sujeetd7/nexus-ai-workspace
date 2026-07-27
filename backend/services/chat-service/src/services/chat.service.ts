import {
  PromptServiceHttpClient,
  type PromptExecuteResponse,
} from "../clients/prompt-service.client";
import { ChatServiceError } from "../errors/chat-service.error";
import { ConversationMemberRepository } from "../repositories/conversation-member.repository";
import { ConversationRepository } from "../repositories/conversation.repository";
import { MessageAttachmentRepository } from "../repositories/message-attachment.repository";
import { MessageRepository } from "../repositories/message.repository";

export { ChatServiceError };

export class ChatService {
  private conversationRepo = new ConversationRepository();
  private memberRepo = new ConversationMemberRepository();
  private messageRepo = new MessageRepository();
  private attachmentRepo = new MessageAttachmentRepository();
  private promptClient = new PromptServiceHttpClient();

  async createConversation(data: any) {
    return this.conversationRepo.create(data);
  }

  async listConversations() {
    return this.conversationRepo.findAll();
  }

  async getConversation(id: string) {
    return this.conversationRepo.findById(id);
  }

  async deleteConversation(id: string) {
    return this.conversationRepo.delete(id);
  }

  async addMember(data: any) {
    return this.memberRepo.create(data);
  }

  async getMembers(conversationId: string) {
    return this.memberRepo.findByConversation(conversationId);
  }

  async createMessage(data: any) {
    return this.messageRepo.create(data);
  }

  async listMessages(conversationId: string) {
    return this.messageRepo.findByConversation(conversationId);
  }

  async addAttachment(data: any) {
    return this.attachmentRepo.create(data);
  }

  async listAttachments(messageId: string) {
    return this.attachmentRepo.findByMessage(messageId);
  }

  /**
   * Chat → Prompt Service → AI Service ownership path.
   *
   *   1. Persist USER message.
   *   2. Call Prompt Service (never AI Service directly; no fallback).
   *   3. On success, persist ASSISTANT message from real Prompt output.
   *   4. On Prompt failure: USER may remain; ASSISTANT is not created; error propagates.
   */
  async sendMessage(data: {
    conversationId: string;
    senderId: string;
    content: string;
    provider?: string;
    model?: string;
    promptVersionId?: string;
    promptId?: string;
    variables?: Record<string, unknown>;
    workspaceId?: string;
    correlationId?: string;
  }) {
    const userMessage = await this.messageRepo.create({
      conversationId: data.conversationId,
      senderId: data.senderId,
      type: "USER",
      content: data.content,
    });

    let promptResponse: PromptExecuteResponse;

    if (data.promptVersionId) {
      promptResponse = await this.promptClient.execute(
        {
          promptVersionId: data.promptVersionId,
          provider: data.provider,
          model: data.model,
          input: data.variables ?? { content: data.content },
        },
        {
          workspaceId: data.workspaceId,
          userId: data.senderId,
          correlationId: data.correlationId,
        },
      );
    } else if (data.promptId) {
      promptResponse = await this.promptClient.executePublished(
        {
          promptId: data.promptId,
          variables: data.variables ?? { content: data.content },
        },
        {
          workspaceId: data.workspaceId,
          userId: data.senderId,
          correlationId: data.correlationId,
        },
      );
    } else {
      // Raw chat text — Prompt Service owns provider/model defaults and rendering.
      promptResponse = await this.promptClient.executeDirect(
        {
          prompt: data.content,
          provider: data.provider,
          model: data.model,
          variables: data.variables,
          workspaceId: data.workspaceId,
          userId: data.senderId,
        },
        { correlationId: data.correlationId },
      );
    }

    const assistantMessage = await this.messageRepo.create({
      conversationId: data.conversationId,
      senderId: "assistant",
      type: "ASSISTANT",
      content: promptResponse.text,
      metadata: {
        totalTokens: promptResponse.totalTokens,
        durationMs: promptResponse.durationMs,
        provider: promptResponse.provider,
        model: promptResponse.model,
      },
    });

    return { userMessage, assistantMessage };
  }
}
