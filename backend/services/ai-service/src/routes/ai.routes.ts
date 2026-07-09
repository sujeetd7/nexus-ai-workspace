import { Router } from "express";
import { AIController } from "../controllers/ai.controller";

const router = Router();

const controller = new AIController();

router.post("/execute", controller.execute);
router.post(
  "/stream",

  controller.stream,
);
router.get("/provider-health", controller.health);
router.post("/embed", controller.embed);

export default router;
