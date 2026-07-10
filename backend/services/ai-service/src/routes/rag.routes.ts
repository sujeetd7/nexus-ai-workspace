import { Router } from "express";

import { RagController } from "../controllers/rag.controller";

const router = Router();

const controller = new RagController();

router.post("/query", controller.query);

export default router;
