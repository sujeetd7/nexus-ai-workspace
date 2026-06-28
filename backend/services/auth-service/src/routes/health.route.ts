import { Router, type Request, type Response } from "express";

const router: Router = Router();

router.get("/", (_req: Request, res: Response) => {
  res.status(200).json({
    service: "auth-service",
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

export default router;