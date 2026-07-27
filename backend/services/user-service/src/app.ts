import cors from "cors";
import express from "express";
import helmet from "helmet";
import { mountExpressOpenApiDocs } from "@nexus/openapi";

import routes from "./routes";
import { userOpenApiSpec } from "./openapi";

export const app = express();

app.use(helmet());

app.use(cors());

app.use(express.json());

mountExpressOpenApiDocs(app, userOpenApiSpec);

app.use("/api/v1", routes);
