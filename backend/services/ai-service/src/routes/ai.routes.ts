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

export default router;
