import { Router } from "express";
import chatRoutes from "./chat.routes";

const router = Router();

router.get("/health", (_, res) => {
  res.json({
    service: "chat-service",
    status: "healthy",
  });
});

router.use(chatRoutes);

export default router;
