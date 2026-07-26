import { ConversationMemberRepository } from "../repositories/conversation-member.repository";
import { ConversationRepository } from "../repositories/conversation.repository";
import { MessageAttachmentRepository } from "../repositories/message-attachment.repository";
import { MessageRepository } from "../repositories/message.repository";

export class ChatService {
  private conversationRepo = new ConversationRepository();
  private memberRepo = new ConversationMemberRepository();
  private messageRepo = new MessageRepository();
  private attachmentRepo = new MessageAttachmentRepository();

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
}
