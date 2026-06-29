import {
  Router,
} from "express";

import {
  authenticate,
} from "../../middleware/auth/auth.middleware";

import {
  authorize,
} from "../../middleware/auth/authorize.middleware";

import {
  Permission,
} from "../../types/auth/permissions";

const router: Router = Router();

router.get(
  "/users",
  authenticate,
  authorize(
    Permission.USER_READ,
  ),
  (_, res) => {

    return res.json({
      success: true,
      message:
        "Admin endpoint",
    });
  },
);

export default router;