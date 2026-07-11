import { Router } from "express";

import { AgentRuntimeController } from "../controllers/agent-execution.controller";

const router = Router();

const controller = new AgentRuntimeController();

router.post("/agents/execute", controller.execute);

router.get("/agents/executions", controller.history);

router.get("/agents/:agentId/executions", controller.historyByAgent);

router.get("/agents/execution/:executionId", controller.execution);

export default router;
