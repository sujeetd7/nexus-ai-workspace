import { Request, Response } from "express";

import { AuthenticatedRequest } from "../middleware/auth/authenticate.middleware";
import { UserService } from "../services/user.service";

export class UserController {
  private service = new UserService();

  create = async (req: Request, res: Response) => {
    const user = await this.service.create(req.body);

    res.status(201).json(user);
  };

  list = async (req: Request, res: Response) => {
    const users = await this.service.list();

    res.json(users);
  };

  getMe = async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const authUserId = authReq.auth?.userId ?? authReq.user?.id;

    if (!authUserId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const user = await this.service.getByAuthUserId(authUserId);

    if (!user) {
      res.status(404).json({ error: "User profile not found" });
      return;
    }

    res.json(user);
  };

  updateMe = async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const authUserId = authReq.auth?.userId ?? authReq.user?.id;

    if (!authUserId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const user = await this.service.updateByAuthUserId(authUserId, req.body);

    if (!user) {
      res.status(404).json({ error: "User profile not found" });
      return;
    }

    res.json(user);
  };

  get = async (req: Request, res: Response) => {
    const user = await this.service.get(req.params.id as string);

    res.json(user);
  };

  update = async (req: Request, res: Response) => {
    const user = await this.service.update(req.params.id as string, req.body);

    res.json(user);
  };

  delete = async (req: Request, res: Response) => {
    await this.service.delete(req.params.id as string);

    res.json({
      message: "User deleted",
    });
  };
}
