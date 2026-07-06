import { Router } from "express";

import { WorkspacePermissionController } from "../controllers/workspace-permission.controller";

const router = Router();

const controller = new WorkspacePermissionController();

router.post("/:id/permissions", controller.grant);

router.get("/:id/permissions/:userId", controller.get);

router.delete("/:id/permissions/:userId/:permission", controller.revoke);

export default router;
