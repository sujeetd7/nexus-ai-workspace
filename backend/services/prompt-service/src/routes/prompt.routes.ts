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
router.post(
  "/prompts/version/:versionId/publish",

  controller.publish,
);
router.post("/prompts/execute-published", controller.executePublished);
router.post("/prompts/rollback", controller.rollback);
router.get("/prompts/executions", controller.history);

router.get("/prompts/:promptId/executions", controller.historyByPrompt);

router.get("/prompts/execution/:executionId", controller.execution);
router.post("/prompts/playground", controller.playground);

export default router;
