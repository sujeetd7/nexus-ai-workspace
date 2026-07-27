import { NextFunction, Request, Response } from "express";
import { ChatService, ChatServiceError } from "../services/chat.service";

export class ChatController {
  private service = new ChatService();

  createConversation = async (req: Request, res: Response) => {
    const data = await this.service.createConversation(req.body);
    res.status(201).json(data);
  };

  listConversations = async (_: Request, res: Response) => {
    const data = await this.service.listConversations();
    res.json(data);
  };

  getConversation = async (req: Request, res: Response) => {
    const data = await this.service.getConversation(req.params.id as string);
    res.json(data);
  };

  deleteConversation = async (req: Request, res: Response) => {
    await this.service.deleteConversation(req.params.id as string);
    res.json({ message: "Conversation deleted" });
  };

  addMember = async (req: Request, res: Response) => {
    const data = await this.service.addMember(req.body);
    res.status(201).json(data);
  };

  listMembers = async (req: Request, res: Response) => {
    const data = await this.service.getMembers(req.params.id as string);
    res.json(data);
  };

  createMessage = async (req: Request, res: Response) => {
    const data = await this.service.createMessage(req.body);
    res.status(201).json(data);
  };

  listMessages = async (req: Request, res: Response) => {
    const data = await this.service.listMessages(req.params.id as string);
    res.json(data);
  };

  addAttachment = async (req: Request, res: Response) => {
    const data = await this.service.addAttachment(req.body);
    res.status(201).json(data);
  };

  sendMessage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { conversationId, senderId, content, provider, model } = req.body as {
        conversationId: string;
        senderId: string;
        content: string;
        provider?: string;
        model?: string;
      };

      if (!conversationId || !senderId || !content) {
        res.status(400).json({
          error: "conversationId, senderId, and content are required",
        });
        return;
      }

      const result = await this.service.sendMessage({
        conversationId,
        senderId,
        content,
        provider,
        model,
        promptVersionId: (req.body as { promptVersionId?: string }).promptVersionId,
        promptId: (req.body as { promptId?: string }).promptId,
        variables: (req.body as { variables?: Record<string, unknown> }).variables,
        workspaceId: (req.body as { workspaceId?: string }).workspaceId,
        correlationId:
          (req.headers["x-correlation-id"] as string | undefined) ??
          (req.body as { correlationId?: string }).correlationId,
      });

      res.status(201).json(result);
    } catch (err) {
      if (err instanceof ChatServiceError) {
        res.status(502).json({ error: err.message });
        return;
      }
      next(err);
    }
  };
}
