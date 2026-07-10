import { Router } from "express";
import { AIController } from "../controllers/ai.controller";
import { health } from "../controllers/health.controller";

const router = Router();

const controller = new AIController();

router.post("/execute", controller.execute);
router.post(
  "/stream",

  controller.stream,
);
router.get("/provider-health", controller.health);
router.get("/health", health);
router.post("/embed", controller.embed);

export default router;
