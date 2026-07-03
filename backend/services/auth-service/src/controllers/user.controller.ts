import { Request, Response } from "express";

export class UserController {
  async me(req: Request, res: Response) {
    res.json({
      success: true,
      data: req.user,
    });
  }
}
