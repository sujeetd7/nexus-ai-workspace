import { Router } from "express";
import { AIController } from "../controllers/ai.controller";
import { health } from "../controllers/health.controller";

const router = Router();

const controller = new AIController();

router.post("/execute", controller.execute);
router.post("/stream", controller.stream);
router.post("/chat", controller.chat);
router.post("/chat/stream", controller.streamChat);
router.post("/embeddings", controller.embeddings);
router.get("/providers", controller.providers);
router.get("/provider-health", controller.health);
router.get("/health", health);

// Legacy endpoints for backward compatibility
router.post("/embed", controller.embed);

export default router;
