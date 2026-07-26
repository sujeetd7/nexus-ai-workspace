import { Router } from "express";

import { WorkspaceBillingController } from "../controllers/workspace-billing.controller";

const router = Router();

const controller = new WorkspaceBillingController();

router.post("/:id/billing", controller.create);

router.get("/:id/billing", controller.get);

router.patch("/:id/billing", controller.update);

export default router;
