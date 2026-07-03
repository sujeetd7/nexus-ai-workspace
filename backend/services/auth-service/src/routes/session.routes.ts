import { Request, Response, Router } from "express";
import { sessionController } from "../controllers/session.controller";
import { authenticate } from "../middleware/auth/authenticate.middleware";

const router: Router = Router();

router.get("/sessions", authenticate, sessionController.getSessions);

router.delete(
  "/sessions/:sessionId",
  authenticate,
  (req: Request<{ sessionId: string }>, res: Response) =>
    sessionController.revokeSession(req, res),
);

router.post("/logout-all", authenticate, sessionController.logoutAll);

export default router;
