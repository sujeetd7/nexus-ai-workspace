import { Request, Response } from "express";
import { ChatService } from "../services/chat.service";

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
}
