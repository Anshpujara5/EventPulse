import { Router } from "express";
import {
  archiveProjectController,
  createProjectController,
  getProjectByIdController,
  getProjectsController,
  getProjectSummaryController,
  restoreProjectController,
  updateProjectController,
} from "../controllers/project.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.post("/", authMiddleware, createProjectController);
router.get("/", authMiddleware, getProjectsController);
router.get("/:id", authMiddleware, getProjectByIdController);
router.get("/:id/summary", authMiddleware, getProjectSummaryController);
router.patch("/:id", authMiddleware, updateProjectController);
router.patch("/:id/archive", authMiddleware, archiveProjectController);
router.patch("/:id/restore", authMiddleware, restoreProjectController);

export default router;
