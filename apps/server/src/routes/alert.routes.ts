import { Router } from "express";
import {
  createAlertController,
  deleteAlertController,
  getAlertsController,
  getAlertTriggersController,
  updateAlertController,
} from "../controllers/alert.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.get("/", authMiddleware, getAlertsController);
router.get("/triggers", authMiddleware, getAlertTriggersController);
router.post("/", authMiddleware, createAlertController);
router.patch("/:id", authMiddleware, updateAlertController);
router.delete("/:id", authMiddleware, deleteAlertController);

export default router;
