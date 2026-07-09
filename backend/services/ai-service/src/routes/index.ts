import { Router } from "express";
import { app } from "src/app";
import { errorMiddleware } from "src/middleware/error.middleware";
import aiRoutes from "./ai.routes";

const router = Router();

router.use("/", aiRoutes);
app.use(errorMiddleware);

export default router;
