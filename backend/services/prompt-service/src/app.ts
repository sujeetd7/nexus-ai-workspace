import cors from "cors";
import express from "express";
import helmet from "helmet";
import { mountExpressOpenApiDocs } from "@nexus/openapi";

import routes from "./routes";
import { promptOpenApiSpec } from "./openapi";

export const app = express();

app.use(helmet());

app.use(cors());

app.use(express.json());

mountExpressOpenApiDocs(app, promptOpenApiSpec);

app.use("/api/v1", routes);
