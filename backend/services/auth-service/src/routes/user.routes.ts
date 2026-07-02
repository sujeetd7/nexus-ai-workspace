import { authenticate } from "@middleware/auth/authenticate.middleware";
import { Router } from "express";
import { UserController } from "../controllers/user.controller";

const router: Router = Router();
router.get("/me", authenticate, UserController.me);
