import { Router } from "express";

const router: Router = Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: Service is healthy
 */
router.get("/", (_, res) => {
  res.status(200).json({
    success: true,
    service: "auth-service",
    status: "UP",
    timestamp: new Date().toISOString(),
  });
});

export default router;
