import cors from "cors";
import express from "express";
import helmet from "helmet";

import { errorMiddleware } from "./middleware/error.middleware";
import { requestLogger } from "./middleware/request.logger";
import routes from "./routes";

export const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

// Request logging
app.use(requestLogger);

app.use("/api/v1", routes);
app.use(errorMiddleware);
