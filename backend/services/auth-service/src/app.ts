
import express, { type Express } from "express";
import cors from "cors";
import compression from "compression";
import helmet from "helmet";

import { requestLogger } from "./middleware/logging/request.logger";
import healthRoute from "./routes/health.route";
import { correlationId } from "./middleware/logging/correlation.middleware";

const app: Express = express();

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(correlationId);
app.use(requestLogger);

app.use("/health", healthRoute);

export default app;