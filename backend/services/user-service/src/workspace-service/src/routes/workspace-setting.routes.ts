import { Router } from "express";

import { WorkspaceSettingController } from "../controllers/workspace-setting.controller";

const router = Router();

const controller = new WorkspaceSettingController();

router.post("/:id/settings", controller.create);

router.get("/:id/settings", controller.get);

router.patch("/:id/settings", controller.update);

export default router;
