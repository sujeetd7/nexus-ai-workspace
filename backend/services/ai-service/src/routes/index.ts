import { Router } from "express";
import aiRoutes from "./ai.routes";
import documentRoutes from "./document-index.routes";
import ragRoutes from "./rag.routes";
import vectorRoutes from "./vector.routes";

const router = Router();

router.use("/", aiRoutes);
router.use("/vector", vectorRoutes);

router.use("/rag", ragRoutes);
router.use("/documents", documentRoutes);

export default router;
