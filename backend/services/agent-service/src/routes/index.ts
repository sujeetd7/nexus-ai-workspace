import { Router } from "express";

import agentRoutes from "./agent.routes";
import healthRoutes from "./health.routes";

const router = Router();

router.use(healthRoutes);

router.use(agentRoutes);

export default router;
