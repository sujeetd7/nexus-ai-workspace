import { Request, Response } from "express";
import { WorkspaceService } from "../services/workspace.service";

export class WorkspaceController {
  private service = new WorkspaceService();

  create = async (req: Request, res: Response) => {
    const workspace = await this.service.create(req.body);
    res.status(201).json(workspace);
  };

  list = async (_req: Request, res: Response) => {
    const workspaces = await this.service.list();
    res.status(200).json(workspaces);
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
