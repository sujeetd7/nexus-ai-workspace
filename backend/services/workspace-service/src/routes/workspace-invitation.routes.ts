import { Router } from "express";

import { WorkspaceInvitationController } from "../controllers/workspace-invitation.controller";
import { authenticate } from "../middleware/auth/authenticate.middleware";

const router = Router();

const controller = new WorkspaceInvitationController();

router.post("/:id/invitations", controller.create);

router.get("/:id/invitations", controller.list);

router.post("/invitations/accept", authenticate, controller.accept);

router.post("/invitations/reject", controller.reject);

router.delete("/invitations/:invitationId", controller.delete);

export default router;
