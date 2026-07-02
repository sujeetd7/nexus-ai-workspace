import compression from "compression";
import cors from "cors";
import express, { Express } from "express";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger";

import { correlationMiddleware } from "./middleware/logging/correlation.middleware";

import { requestLogger } from "./middleware/logging/request.logger";

import healthRoutes from "./routes/health.routes";

import authRoutes from "./routes/auth/auth.routes";

import { notFound } from "./middleware/error/not-found.middleware";

import { errorHandler } from "./middleware/error/error.middleware";

import sessionRoutes from "@routes/session.routes";
import adminRoutes from "./routes/admin/admin.routes";
import profileRoutes from "./routes/profile/profile.routes";

export default function createApp(): Express {
  const app = express();

  /*
    SECURITY
  */
  app.use(helmet());

  /*
    PERFORMANCE
  */
  app.use(compression());

  /*
    CORS
  */
  app.use(cors());

  /*
    REQUEST CORRELATION
  */
  app.use(correlationMiddleware);

  /*
    REQUEST LOGGING
  */
  app.use(requestLogger);

  /*
    BODY PARSER
  */
  app.use(express.json());

  app.use(
    express.urlencoded({
      extended: true,
    }),
  );

  /*
    HEALTH ROUTES
  */
  app.use("/health", healthRoutes);

  /*
    AUTH ROUTES
  */
  app.use("/api/v1/auth", authRoutes);

  app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  app.use("/profile", profileRoutes);

  app.use("/admin", adminRoutes);
  app.use("/api/v1/auth", sessionRoutes);

  /*
    404 HANDLER
  */
  app.use(notFound);

  /*
    GLOBAL ERROR HANDLER
  */
  app.use(errorHandler);

  return app;
}
