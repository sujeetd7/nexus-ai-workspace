import { Router } from "express";

import { PromptController } from "../controllers/prompt.controller";

const router = Router();

const controller = new PromptController();

// ── Collections / actions (static paths must be registered before /:id) ──────
router.get("/prompts", controller.list);
router.post("/prompts", controller.create);

router.get("/prompts/analytics", controller.analytics);
router.get("/prompts/executions", controller.history);

router.post("/prompts/execute", controller.execute);
router.post("/prompts/execute-direct", controller.executeDirect);
router.post("/prompts/execute-published", controller.executePublished);
router.post("/prompts/playground", controller.playground);
router.post("/prompts/compare", controller.compare);
router.post("/prompts/rollback", controller.rollback);
router.post("/prompts/version", controller.createVersion);

// ── Execution detail (static :executionId segment before parameterised /:id) ─
router.get("/prompts/execution/:executionId", controller.execution);

// ── Version publish (contains static "version" segment before /:id) ──────────
router.post("/prompts/version/:versionId/publish", controller.publish);

// ── Parameterised single-prompt routes (must follow all static /prompts/…) ───
router.get("/prompts/:id", controller.get);
router.delete("/prompts/:id", controller.delete);
router.get("/prompts/:promptId/executions", controller.historyByPrompt);

export default router;
