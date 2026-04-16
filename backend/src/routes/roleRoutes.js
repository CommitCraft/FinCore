import express from "express";
import {
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole
} from "../controllers/roleController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { authorize } from "../middlewares/rbacMiddleware.js";
import { ROLES } from "../constants/roles.js";

const router = express.Router();

// Public: Get all roles (no authentication needed)
router.get("/", getAllRoles);

// Protected: Only admins can perform CRUD operations
router.get("/:id", protect, getRoleById);
router.post("/", protect, authorize(ROLES.ADMIN), createRole);
router.patch("/:id", protect, authorize(ROLES.ADMIN), updateRole);
router.delete("/:id", protect, authorize(ROLES.ADMIN), deleteRole);

export default router;
