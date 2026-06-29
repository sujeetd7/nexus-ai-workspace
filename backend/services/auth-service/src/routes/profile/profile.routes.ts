import {
  Router,
  Request,
  Response,
} from "express";

import {
  authenticate,
} from "../../middleware/auth/auth.middleware";

const router: Router =
  Router();

router.get(
  "/me",
  authenticate,
  (
    req: Request,
    res: Response,
  ) => {

    const user =
      (
        req as Request & {
          user: unknown;
        }
      ).user;

    return res.json({
      success: true,
      user,
    });
  },
);

export default router;