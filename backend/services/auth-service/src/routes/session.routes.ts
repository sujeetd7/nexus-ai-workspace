import { Router } from "express";
import { sessionController } from "../controllers/session.controller";
import { authenticate } from "../middleware/auth/authenticate.middleware";

const router: Router = Router();

router.get("/sessions", authenticate, sessionController.getSessions);

router.delete(
  "/sessions/:sessionId",
  authenticate,
  sessionController.revokeSession,
);

router.post("/logout-all", authenticate, sessionController.logoutAll);

export default router;
