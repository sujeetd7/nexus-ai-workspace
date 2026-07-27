import { Router } from "express";

const router = Router();

router.get("/", (_, res) => {
  res.json({
    service: "api-gateway",
    status: "UP",
    timestamp: new Date(),
  });
});

export default router;
