import cors from "cors";
import express from "express";
import helmet from "helmet";
import { mountExpressOpenApiDocs } from "@nexus/openapi";

import kernelRoutes from "./routes/kernel.routes";
import { kernelOpenApiSpec } from "./openapi";

export const app = express();

app.use(helmet());

app.use(cors());

app.use(express.json());

mountExpressOpenApiDocs(app, kernelOpenApiSpec);

app.use("/api/v1/kernel", kernelRoutes);
