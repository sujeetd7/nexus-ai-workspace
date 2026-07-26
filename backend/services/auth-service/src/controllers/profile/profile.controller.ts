import { Request, Response } from "express";

export class ProfileController {
  async me(req: Request, res: Response) {
    return res.status(200).json({
      success: true,
      data: req.user,
    });
  }
}

export const profileController = new ProfileController();
