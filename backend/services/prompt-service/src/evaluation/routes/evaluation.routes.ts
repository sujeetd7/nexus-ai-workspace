import { Router } from "express";

import { EvaluationController } from "../controllers/evaluation.controller";

const router = Router();

const controller = new EvaluationController();

router.post("/evaluations/run", controller.run);

router.get("/evaluations", controller.history);

router.get("/evaluations/:id", controller.details);

export default router;
