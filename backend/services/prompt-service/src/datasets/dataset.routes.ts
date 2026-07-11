import { Router } from "express";
import { DatasetController } from "./dataset.controller";

const router = Router();
const controller = new DatasetController();

router.post("/", controller.create);
router.get("/", controller.list);
router.get("/:id", controller.get);
router.put("/:id", controller.update);
router.delete("/:id", controller.delete);
router.post("/:id/cases", controller.addCase);
router.delete("/:id/cases/:caseId", controller.removeCase);

export default router;
