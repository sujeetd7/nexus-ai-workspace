import cors from "cors";
import express from "express";
import helmet from "helmet";

import kernelRoutes from "./routes/kernel.routes";

export const app = express();

app.use(helmet());

app.use(cors());

app.use(express.json());

app.use("/api/v1/kernel", kernelRoutes);
