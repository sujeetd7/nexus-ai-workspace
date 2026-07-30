import { Request, Response } from "express";
import {
  AuthenticatedRequest,
} from "../middleware/auth/authenticate.middleware";
import { WorkspaceService } from "../services/workspace.service";

export class WorkspaceController {
  private service = new WorkspaceService();

  create = async (req: Request, res: Response) => {
    const workspace = await this.service.create(req.body);
    res.status(201).json(workspace);
  };

  list = async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.auth?.userId ?? authReq.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const workspaces = await this.service.list(userId);
    return res.status(200).json(workspaces);
  };

  get = async (req: Request<{ id: string }>, res: Response) => {
    const workspace = await this.service.get(req.params.id);

    if (!workspace) {
      return res.status(404).json({
        message: "Workspace not found",
      });
    }

    return res.status(200).json(workspace);
  };

  update = async (req: Request<{ id: string }>, res: Response) => {
    const workspace = await this.service.update(req.params.id, req.body);

    return res.status(200).json(workspace);
  };

  delete = async (req: Request<{ id: string }>, res: Response) => {
    await this.service.delete(req.params.id);

    return res.status(200).json({
      message: "Workspace deleted",
    });
  };
}
