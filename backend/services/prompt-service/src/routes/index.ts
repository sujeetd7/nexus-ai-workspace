import { Router } from "express";
import promptRoutes from "./prompt.routes";

const router: Router = Router();

router.use(promptRoutes);

export default router;
