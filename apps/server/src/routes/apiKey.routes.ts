import { Router } from "express";
import {
  createApiKeyController,
  deleteApiKeyController,
  getApiKeysController,
} from "../controllers/apiKey.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.get("/", authMiddleware, getApiKeysController);
router.post("/", authMiddleware, createApiKeyController);
router.delete("/:id", authMiddleware, deleteApiKeyController);

export default router;
