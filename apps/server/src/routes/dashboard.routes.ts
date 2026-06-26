import { Router } from "express";
import { getDashboardSummaryController } from "../controllers/dashboard.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.get("/summary", authMiddleware, getDashboardSummaryController);

export default router;
