import { authenticate } from "@middleware/auth/authenticate.middleware";
import { Router } from "express";
import { UserController } from "../controllers/user.controller";

const router: Router = Router();
const userController = new UserController();
router.get("/me", authenticate, userController.me.bind(userController));
