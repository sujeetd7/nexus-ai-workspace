import { Router } from "express";
import benchmarkRoutes from "../benchmarks/benchmark.routes";
import datasetRoutes from "../datasets/dataset.routes";
import evaluationRoutes from "../evaluation/routes/evaluation.routes";
import promptRoutes from "./prompt.routes";

const router: Router = Router();

router.use(promptRoutes);
router.use(evaluationRoutes);
router.use("/datasets", datasetRoutes);
router.use("/benchmarks", benchmarkRoutes);

export default router;
