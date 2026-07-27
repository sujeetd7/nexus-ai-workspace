import cors from "cors";
import express from "express";
import helmet from "helmet";
import { mountExpressOpenApiDocs } from "@nexus/openapi";

import workspaceMemberRoutes from "@routes/workspace-member.routes";
import { errorHandler } from "./middleware/error/error.middleware";
import routes from "./routes";
import healthRoutes from "./routes/health.routes";
import { workspaceOpenApiSpec } from "./openapi";

export const app = express();

app.use(helmet());

app.use(cors());

app.use(express.json());

mountExpressOpenApiDocs(app, workspaceOpenApiSpec);

app.use("/api/v1", routes);
app.use("/api/v1/workspaces", workspaceMemberRoutes);

app.use("/health", healthRoutes);

app.use(errorHandler);
