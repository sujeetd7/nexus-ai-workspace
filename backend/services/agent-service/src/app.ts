import cors from "cors";
import express from "express";
import helmet from "helmet";
import { mountExpressOpenApiDocs } from "@nexus/openapi";
import { errorHandler } from "./middleware/error-handler";
import routes from "./routes";
import { agentOpenApiSpec } from "./openapi";

export const app = express();

app.use(helmet());

app.use(cors());

app.use(express.json());

mountExpressOpenApiDocs(app, agentOpenApiSpec);

app.use("/api/v1", routes);

app.use(errorHandler);
