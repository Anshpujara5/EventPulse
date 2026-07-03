import { Router } from "express";
import {
  createProjectController,
  getProjectByIdController,
  getProjectsController,
  getProjectSummaryController,
  updateProjectController,
} from "../controllers/project.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.post("/", authMiddleware, createProjectController);
router.get("/", authMiddleware, getProjectsController);
router.get("/:id", authMiddleware, getProjectByIdController);
router.get("/:id/summary", authMiddleware, getProjectSummaryController);
router.patch("/:id", authMiddleware, updateProjectController);

export default router;
