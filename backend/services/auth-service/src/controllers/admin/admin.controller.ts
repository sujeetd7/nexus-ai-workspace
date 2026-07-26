import { Request, Response } from "express";

export class AdminController {
  async dashboard(_req: Request, res: Response) {
    return res.status(200).json({
      success: true,
      message: "Welcome Admin Dashboard",
    });
  }
}

export const adminController = new AdminController();
