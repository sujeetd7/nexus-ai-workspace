import { Router } from "express";
import userRoutes from "./user.routes";

const router: Router = Router();

router.use(userRoutes);

export default router;
