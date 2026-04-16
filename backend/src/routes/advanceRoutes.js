import { Router } from "express";
import { createAdvance, getMyAdvanceById, getMyAdvances, updateMyAdvance } from "../controllers/advanceController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { authorize } from "../middlewares/rbacMiddleware.js";
import { ROLES } from "../constants/roles.js";

const router = Router();

router.post("/", protect, authorize(ROLES.EMPLOYEE), createAdvance);
router.get("/my", protect, authorize(ROLES.EMPLOYEE), getMyAdvances);
router.get("/my/:id", protect, authorize(ROLES.EMPLOYEE), getMyAdvanceById);
router.patch("/:id", protect, authorize(ROLES.EMPLOYEE), updateMyAdvance);

export default router;
