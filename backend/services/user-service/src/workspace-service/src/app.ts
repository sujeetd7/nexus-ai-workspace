import cors from "cors";
import express from "express";
import helmet from "helmet";

import workspaceMemberRoutes from "@routes/workspace-member.routes";
import { errorHandler } from "./middleware/error/error.middleware";
import routes from "./routes";
import healthRoutes from "./routes/health.routes";

export const app = express();

app.use(helmet());

app.use(cors());

app.use(express.json());

app.use("/api/v1", routes);
app.use("/api/v1/workspaces", workspaceMemberRoutes);

app.use("/health", healthRoutes);

app.use(errorHandler);
