import { Router } from "express";
import { BenchmarkController } from "./benchmark.controller";

const router = Router();
const controller = new BenchmarkController();

router.post("/", controller.run);
router.get("/", controller.list);
router.get("/:id", controller.get);

export default router;
