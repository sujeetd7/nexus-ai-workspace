import { Router } from "express";
import { WorkspaceController } from "../controllers/workspace.controller";

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

router.get("/workspaces", workspaceController.list.bind(workspaceController));

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

export default router;
