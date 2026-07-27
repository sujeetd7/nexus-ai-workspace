import { Router } from "express";
import { ChatController } from "../controllers/chat.controller";

const router = Router();
const controller = new ChatController();

router.post("/conversations", controller.createConversation);
router.get("/conversations", controller.listConversations);
router.get("/conversations/:id", controller.getConversation);
router.delete("/conversations/:id", controller.deleteConversation);

router.post("/conversations/member", controller.addMember);
router.get("/conversations/:id/members", controller.listMembers);

// AI-orchestrated message: persists user + assistant turns via AI Service
router.post("/messages/send", controller.sendMessage);

router.post("/messages", controller.createMessage);
router.get("/conversations/:id/messages", controller.listMessages);

router.post("/attachments", controller.addAttachment);

export default router;
