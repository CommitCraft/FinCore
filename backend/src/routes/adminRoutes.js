import { Router } from "express";
import {
  getAdvanceById,
  createUser,
  getExpenseById,
  getExpenseReceiptByAdmin,
  getAllAdvances,
  getAllExpenses,
  getUserById,
  getAllUsers,
  updateUser,
  deleteUser,
  updateAdvanceStatus,
  updateExpenseStatus,
  getRoles,
  createRole,
  updateRole,
  deleteRole,
  getPendingUsers,
  approveUser,
  rejectUser,
  updateUserPanStatus,
  updateUserBankStatus
} from "../controllers/adminController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { authorize } from "../middlewares/rbacMiddleware.js";
import { ROLES } from "../constants/roles.js";

const router = Router();

router.use(protect, authorize(ROLES.ADMIN));

router.get("/expenses", getAllExpenses);
router.get("/expenses/:id", getExpenseById);
router.get("/expenses/:id/receipt", getExpenseReceiptByAdmin);
router.patch("/expenses/:id/status", updateExpenseStatus);

router.get("/advances", getAllAdvances);
router.get("/advances/:id", getAdvanceById);
router.patch("/advances/:id/status", updateAdvanceStatus);

router.get("/users", getAllUsers);
router.post("/users", createUser);
router.get("/users/:id", getUserById);
router.patch("/users/:id", updateUser);
router.patch("/users/:id/pan", updateUserPanStatus);
router.patch("/users/:id/bank", updateUserBankStatus);
router.delete("/users/:id", deleteUser);

router.get("/roles", getRoles);
router.post("/roles", createRole);
router.patch("/roles/:id", updateRole);
router.delete("/roles/:id", deleteRole);

router.get("/pending-users", getPendingUsers);
router.patch("/users/:id/approve", approveUser);
router.patch("/users/:id/reject", rejectUser);

export default router;
