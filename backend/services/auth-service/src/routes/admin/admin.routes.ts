import { Router } from "express";

import { authenticate } from "../../middleware/auth/authenticate.middleware";

import { authorize } from "../../middleware/auth/authorize.middleware";

import { UserRole } from "@prisma/client";
import { adminController } from "../../controllers/admin/admin.controller";

const router: Router = Router();

/**
 * @swagger
 * /admin/dashboard:
 *   get:
 *     summary: Admin dashboard
 *     tags:
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin access
 */
router.get(
  "/dashboard",
  authenticate,
  authorize(UserRole.ADMIN),
  adminController.dashboard,
);

export default router;
