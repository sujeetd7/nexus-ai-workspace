import { Router } from "express";

import { validate } from "../../middleware/validation/validate.middleware";
import { authController } from "./../../controllers/auth/auth.controller";

import { registerSchema } from "../../schemas/auth/register.schema";

import { loginSchema } from "../../schemas/auth/login.schema";

import { authenticate } from "../../middleware/auth/authenticate.middleware";
import { refreshSchema } from "../../schemas/auth/refresh.schema";

const router: Router = Router();

console.log("controller");

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register user
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered
 */

router.post("/register", validate(registerSchema), authController.register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login user
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 */

router.post("/login", validate(loginSchema), authController.login);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token refreshed
 */

router.post("/refresh", validate(refreshSchema), authController.refresh);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout
 *     tags:
 *       - Authentication
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       204:
 *         description: Logout successful
 */

router.post("/logout", authenticate, authController.logout);

router.get("/sessions", authenticate, authController.sessions);

router.delete("/sessions/:id", authenticate, authController.revokeSession);

router.delete("/sessions", authenticate, authController.logoutAll);
router.post("/verify-email", authController.verifyEmail);

router.post("/resend-verification", authController.resendVerification);
/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     tags:
 *       - Authentication
 */
router.post("/forgot-password", authController.forgotPassword);

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Reset password
 *     tags:
 *       - Authentication
 */

router.post("/reset-password", authController.resetPassword);

export default router;
