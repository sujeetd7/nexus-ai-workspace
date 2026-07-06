import { Router } from "express";

import { PromptController } from "../controllers/prompt.controller";

const router = Router();

const controller = new PromptController();

router.post("/prompts", controller.create);

router.post("/prompts/version", controller.createVersion);

router.post("/prompts/execute", controller.execute);

router.get("/prompts", controller.list);

router.get("/prompts/:id", controller.get);

router.delete("/prompts/:id", controller.delete);

export default router;
