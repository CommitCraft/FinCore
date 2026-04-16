import { Router } from "express";
import { createExpense, getMyExpenseById, getMyExpenseReceipt, getMyExpenses, updateMyExpense } from "../controllers/expenseController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { authorize } from "../middlewares/rbacMiddleware.js";
import { ROLES } from "../constants/roles.js";
import { upload } from "../middlewares/uploadMiddleware.js";

const router = Router();

router.post("/", protect, authorize(ROLES.EMPLOYEE), upload.single("receipt"), createExpense);
router.get("/my", protect, authorize(ROLES.EMPLOYEE), getMyExpenses);
router.get("/my/:id", protect, authorize(ROLES.EMPLOYEE), getMyExpenseById);
router.get("/:id/receipt", protect, authorize(ROLES.EMPLOYEE), getMyExpenseReceipt);
router.patch("/:id", protect, authorize(ROLES.EMPLOYEE), upload.single("receipt"), updateMyExpense);

export default router;
