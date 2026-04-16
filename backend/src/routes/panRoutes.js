import { Router } from "express";
import { getMyPan, upsertMyPan } from "../controllers/panController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = Router();

router.use(protect);
router.get("/my", getMyPan);
router.put("/my", upsertMyPan);

export default router;
