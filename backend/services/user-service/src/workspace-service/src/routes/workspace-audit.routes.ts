import { Router } from "express";

import { WorkspaceAuditController } from "../controllers/workspace-audit.controller";

const router = Router();

const controller = new WorkspaceAuditController();

router.post("/:id/audit", controller.create);

router.get("/:id/audit", controller.list);

export default router;
