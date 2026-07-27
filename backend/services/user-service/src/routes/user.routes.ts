import { Router } from "express";

import { UserController } from "../controllers/user.controller";
import { authenticate } from "../middleware/auth/authenticate.middleware";

const router = Router();

const controller = new UserController();

router.get("/users/me", authenticate, controller.getMe);

router.patch("/users/me", authenticate, controller.updateMe);

router.post("/users", controller.create);

router.get("/users", controller.list);

router.get("/users/:id", controller.get);

router.patch("/users/:id", controller.update);

router.delete("/users/:id", controller.delete);

export default router;
