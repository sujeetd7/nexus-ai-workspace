import { Router } from "express";

import { DocumentController } from "../controllers/document.controller";

const router = Router();

const controller = new DocumentController();

router.post("/documents", controller.create);

router.get("/documents", controller.list);

router.get("/documents/:id", controller.get);

router.patch("/documents/:id", controller.update);

router.delete("/documents/:id", controller.delete);

export default router;
