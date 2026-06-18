import { Router } from "express";
import {
  createProjectController,
  getProjectByIdController,
  getProjectsController,
} from "../controllers/project.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.post("/", authMiddleware, createProjectController);
router.get("/", authMiddleware, getProjectsController);
router.get("/:id", authMiddleware, getProjectByIdController);

export default router;
