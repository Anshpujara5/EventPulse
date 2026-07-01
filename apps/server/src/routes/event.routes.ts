import { Router } from "express";
import {
  getEventsController,
  ingestEventController,
} from "../controllers/event.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

// Public — authenticated via raw API key
router.post("/ingest", ingestEventController);

// Protected — authenticated via JWT
router.get("/", authMiddleware, getEventsController);

export default router;
