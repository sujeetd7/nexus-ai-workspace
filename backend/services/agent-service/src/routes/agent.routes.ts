import { Router } from "express";

import { AgentController } from "../controllers/agent.controller";

const router = Router();

const controller = new AgentController();

router.post("/agents", controller.create);

router.get("/agents", controller.list);

router.get("/agents/:id", controller.get);

router.put("/agents/:id", controller.update);

router.delete("/agents/:id", controller.delete);

export default router;
