import { Router } from "express";

import { UserController } from "../controllers/user.controller";

const router = Router();

const controller = new UserController();

router.post("/users", controller.create);

router.get("/users", controller.list);

router.get("/users/:id", controller.get);

router.patch("/users/:id", controller.update);

router.delete("/users/:id", controller.delete);

export default router;
