import { Router } from "express";
import { me, signin, signup, updateMe } from "../controllers/auth.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.post("/signup", signup);
router.post("/signin", signin);
router.get("/me", authMiddleware, me);
router.patch("/me", authMiddleware, updateMe);

export default router;
