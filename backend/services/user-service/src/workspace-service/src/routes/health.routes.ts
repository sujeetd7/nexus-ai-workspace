import { Router } from "express";

const router = Router();

router.get("/", (_, res) => {
  res.json({
    service: "workspace-service",
    status: "UP",
    timestamp: new Date(),
  });
});

export default router;
