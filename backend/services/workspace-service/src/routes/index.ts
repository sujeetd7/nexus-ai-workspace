import { Router } from "express";
import { WorkspaceController } from "../controllers/workspace.controller";
import { authenticate } from "../middleware/auth/authenticate.middleware";
import workspaceAuditRoutes from "./workspace-audit.routes";
import workspaceBillingRoutes from "./workspace-billing.routes";
import workspaceInvitationRoutes from "./workspace-invitation.routes";
import workspacePermissionRoutes from "./workspace-permission.routes";
import workspaceSettingRoutes from "./workspace-setting.routes";

const router = Router();

const workspaceController = new WorkspaceController();

router.get("/health", (req, res) => {
  res.json({
    service: "workspace-service",
    status: "healthy",
  });
});

router.post(
  "/workspaces",
  workspaceController.create.bind(workspaceController),
);

router.get(
  "/workspaces",
  authenticate,
  workspaceController.list.bind(workspaceController),
);

router.get(
  "/workspaces/:id",
  workspaceController.get.bind(workspaceController),
);

router.patch(
  "/workspaces/:id",
  workspaceController.update.bind(workspaceController),
);

router.delete(
  "/workspaces/:id",
  workspaceController.delete.bind(workspaceController),
);

router.use("/workspaces", workspaceInvitationRoutes);
router.use("/workspaces", workspacePermissionRoutes);
router.use("/workspaces", workspaceSettingRoutes);

router.use("/workspaces", workspaceBillingRoutes);
router.use("/workspaces", workspaceAuditRoutes);

export default router;
