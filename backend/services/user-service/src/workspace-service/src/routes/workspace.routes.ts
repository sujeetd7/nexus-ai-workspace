import { Router } from "express";

import { WorkspaceController } from "../controllers/workspace.controller";

const router = Router();

const controller = new WorkspaceController();

router.post("/", controller.create);
router.get("/", controller.list);
router.get("/:id", controller.get);
router.patch("/:id", controller.update);
router.delete("/:id", controller.delete);

export default router;
