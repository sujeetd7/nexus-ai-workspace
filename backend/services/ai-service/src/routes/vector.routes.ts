import { Router } from "express";

import { VectorController } from "../controllers/vector.controller";

const router = Router();

const controller = new VectorController();

router.post("/upsert", controller.upsert);
router.post("/upsert-batch", controller.upsertBatch);
router.post("/search", controller.search);

export default router;
