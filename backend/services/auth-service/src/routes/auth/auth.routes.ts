import { Router } from "express";

import {
  authController,
} from "./../../controllers/auth/auth.controller";

const router:Router = Router();

router.post(
  "/register",
  authController.register
);

router.post(
  "/login",
  authController.login
);

router.post(
  "/refresh",
  authController.refresh
);

router.post(
  "/logout",
  authController.logout
);

export default router;