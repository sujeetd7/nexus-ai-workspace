import { Router } from "express";

import { authenticate } from "../../middleware/auth/authenticate.middleware";

import { profileController } from "../../controllers/profile/profile.controller";

const router: Router = Router();

/**
 * @swagger
 * /profile/me:
 *   get:
 *     summary: Get current profile
 *     tags:
 *       - Profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 */
router.get("/me", authenticate, profileController.me);

export default router;
