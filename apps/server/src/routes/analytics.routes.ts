import { Router } from "express";
import { getAnalyticsSummaryController } from "../controllers/analytics.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.get("/summary", authMiddleware, getAnalyticsSummaryController);

export default router;
