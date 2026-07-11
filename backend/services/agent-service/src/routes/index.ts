import { Router } from "express";

import runtimeRoutes from "./agent-execution.routes";
import agentRoutes from "./agent.routes";
import healthRoutes from "./health.routes";

const router = Router();

router.use(healthRoutes);

router.use(agentRoutes);

router.use(runtimeRoutes);

export default router;
