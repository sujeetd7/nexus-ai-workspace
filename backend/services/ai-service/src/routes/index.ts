import { Router } from "express";
import aiRoutes from "./ai.routes";

const router = Router();

router.use("/", aiRoutes);

export default router;
