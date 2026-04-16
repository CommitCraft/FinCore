import { ExpenseReport } from "../models/ExpenseReport.js";
import { SalaryAdvance } from "../models/SalaryAdvance.js";
import { User } from "../models/User.js";
import { ROLES } from "../constants/roles.js";
import { env } from "../config/env.js";
import path from "path";
import fs from "fs/promises";

export const getAllExpenses = async (req, res, next) => {
  try {
    const filter = req.query.status ? { status: req.query.status } : {};
    const expenses = await ExpenseReport.find(filter)
      .populate("user", "name email role")
      .populate("reviewedBy", "name email")
      .sort({ createdAt: -1 });
    res.json(expenses);
  } catch (error) {
    next(error);
  }
};

export const getExpenseById = async (req, res, next) => {
  try {
    const expense = await ExpenseReport.findById(req.params.id).populate("user", "name email role").populate("reviewedBy", "name email");
    if (!expense) {
      const error = new Error("Expense not found");
      error.statusCode = 404;
      throw error;
    }

    res.json(expense);
  } catch (error) {
    next(error);
  }
};

export const getExpenseReceiptByAdmin = async (req, res, next) => {
  try {
    const expense = await ExpenseReport.findById(req.params.id);
    if (!expense) {
      const error = new Error("Expense not found");
      error.statusCode = 404;
      throw error;
    }

    if (expense.receipt?.provider !== "local") {
      const error = new Error("Receipt preview is available only for local storage");
      error.statusCode = 400;
      throw error;
    }

    const safeKey = path.basename(expense.receipt.key);
    const filePath = path.resolve(process.cwd(), env.localUploadDir, safeKey);
    await fs.access(filePath);

    res.setHeader("Content-Type", expense.receipt.mimeType || "application/octet-stream");
    res.setHeader("Content-Disposition", `inline; filename="${expense.receipt.originalName || safeKey}"`);
    return res.sendFile(filePath);
  } catch (error) {
    if (error?.code === "ENOENT") {
      const notFoundError = new Error("Receipt file not found");
      notFoundError.statusCode = 404;
      return next(notFoundError);
    }
    next(error);
  }
};

export const updateExpenseStatus = async (req, res, next) => {
  try {
    const { status, adminNote } = req.body;
    const expense = await ExpenseReport.findById(req.params.id);
    if (!expense) {
      const error = new Error("Expense not found");
      error.statusCode = 404;
      throw error;
    }

    expense.status = status;
    expense.adminNote = adminNote;
    expense.reviewedBy = req.user._id;
    expense.reviewedAt = new Date();
    await expense.save();

    res.json(expense);
  } catch (error) {
    next(error);
  }
};

export const getAllAdvances = async (req, res, next) => {
  try {
    const filter = req.query.status ? { status: req.query.status } : {};
    const advances = await SalaryAdvance.find(filter)
      .populate("user", "name email role")
      .populate("reviewedBy", "name email")
      .sort({ createdAt: -1 });
    res.json(advances);
  } catch (error) {
    next(error);
  }
};

export const getAdvanceById = async (req, res, next) => {
  try {
    const advance = await SalaryAdvance.findById(req.params.id).populate("user", "name email role").populate("reviewedBy", "name email");
    if (!advance) {
      const error = new Error("Advance not found");
      error.statusCode = 404;
      throw error;
    }

    res.json(advance);
  } catch (error) {
    next(error);
  }
};

export const updateAdvanceStatus = async (req, res, next) => {
  try {
    const { status, adminNote, tdsRate } = req.body;
    const advance = await SalaryAdvance.findById(req.params.id);
    if (!advance) {
      const error = new Error("Advance not found");
      error.statusCode = 404;
      throw error;
    }

    advance.status = status;
    advance.adminNote = adminNote;

    if (String(status || "").toUpperCase() === "APPROVED") {
      const parsedRate = Number(tdsRate);
      const safeRate = Number.isFinite(parsedRate) ? Math.max(0, Math.min(100, parsedRate)) : 10;
      const computedTds = Number(((Number(advance.amount || 0) * safeRate) / 100).toFixed(2));
      advance.tdsRate = safeRate;
      advance.tdsAmount = computedTds;
      advance.netAmount = Number((Number(advance.amount || 0) - computedTds).toFixed(2));
    } else {
      advance.tdsRate = 0;
      advance.tdsAmount = 0;
      advance.netAmount = Number(advance.amount || 0);
    }

    advance.reviewedBy = req.user._id;
    advance.reviewedAt = new Date();
    await advance.save();

    res.json(advance);
  } catch (error) {
    next(error);
  }
};

export const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find().select("name email phone address role bankDetails panDetails createdAt updatedAt").sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    next(error);
  }
};

const buildBankDetails = (body) => ({
  accountHolderName: body.accountHolderName?.trim() || undefined,
  bankName: body.bankName?.trim() || undefined,
  accountNumber: body.accountNumber?.trim() || undefined,
  ifscCode: body.ifscCode?.trim() || undefined,
  branch: body.branch?.trim() || undefined,
  upiId: body.upiId?.trim() || undefined,
  status: body.bankDetails?.status || body.bankStatus || undefined
});

export const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, panDetails } = req.body;

    if (!name || !email || !password) {
      const error = new Error("name, email and password are required");
      error.statusCode = 400;
      throw error;
    }

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) {
      const error = new Error("Email already exists");
      error.statusCode = 409;
      throw error;
    }

    // Validate role exists in Role collection
    const { Role } = await import("../models/Role.js");
    let safeRole = role || ROLES.EMPLOYEE;
    
    if (role) {
      const roleExists = await Role.findOne({ name: String(role).toUpperCase() });
      if (!roleExists) {
        const error = new Error("Invalid role");
        error.statusCode = 400;
        throw error;
      }
      safeRole = roleExists.name;
    } else {
      const defaultRole = await Role.findOne({ isDefault: true });
      safeRole = defaultRole ? defaultRole.name : ROLES.EMPLOYEE;
    }

    const bankDetails = buildBankDetails(req.body);
    const hasBankInput = Object.values(bankDetails).some((value) => value !== undefined);

    // Users created by admin are immediately active
    const user = await User.create({
      name,
      email,
      password,
      role: safeRole,
      bankDetails: hasBankInput ? { ...bankDetails, status: bankDetails.status || "approved", reviewedAt: new Date() } : undefined,
      panDetails: panDetails && typeof panDetails === "object" ? panDetails : undefined,
      status: "active",
      registrationSource: "admin",
      approvedAt: new Date(),
      approvedBy: req.user._id
    });

    res.status(201).json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      bankDetails: user.bankDetails,
      panDetails: user.panDetails
    });
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const { role, name, email, password, phone, address } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    // Validate role if provided
    if (role) {
      const { Role } = await import("../models/Role.js");
      const roleExists = await Role.findOne({ name: String(role).toUpperCase() });
      if (!roleExists) {
        const error = new Error("Invalid role");
        error.statusCode = 400;
        throw error;
      }
      user.role = roleExists.name;
    }

    if (name) user.name = name;
    if (email) user.email = email.toLowerCase();
    if (password) user.password = password;
    if (phone !== undefined) user.phone = phone;
    if (address !== undefined) user.address = address;

    const nextBankDetails = buildBankDetails(req.body);
    const hasBankInput = Object.values(nextBankDetails).some((value) => value !== undefined);

    user.bankDetails = {
      ...user.bankDetails?.toObject?.(),
      ...Object.fromEntries(Object.entries(nextBankDetails).filter(([, value]) => value !== undefined)),
      ...(hasBankInput && !nextBankDetails.status ? { status: user.bankDetails?.status || "approved" } : {})
    };

    if (req.body.panDetails && typeof req.body.panDetails === "object") {
      user.panDetails = {
        ...(user.panDetails?.toObject?.() || user.panDetails || {}),
        ...Object.fromEntries(Object.entries(req.body.panDetails).filter(([, value]) => value !== undefined))
      };
    }

    await user.save();

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      role: user.role,
      bankDetails: user.bankDetails,
      panDetails: user.panDetails
    });
  } catch (error) {
    next(error);
  }
};

export const updateUserBankStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const user = await User.findById(id);
    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    const normalizedStatus = String(status || "").toLowerCase();
    if (!["pending", "approved", "rejected"].includes(normalizedStatus)) {
      const error = new Error("Invalid bank status");
      error.statusCode = 400;
      throw error;
    }

    user.bankDetails = {
      ...(user.bankDetails?.toObject?.() || user.bankDetails || {}),
      status: normalizedStatus,
      reviewedAt: new Date()
    };

    await user.save();

    res.json({
      message: "Bank status updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        bankDetails: user.bankDetails
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select("name email phone address role bankDetails panDetails createdAt updatedAt");
    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
};

export const updateUserPanStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, panNumber } = req.body;

    const user = await User.findById(id);
    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    const normalizedStatus = String(status || "").toLowerCase();
    if (!["pending", "approved", "rejected"].includes(normalizedStatus)) {
      const error = new Error("Invalid PAN status");
      error.statusCode = 400;
      throw error;
    }

    user.panDetails = {
      ...(user.panDetails?.toObject?.() || user.panDetails || {}),
      ...(panNumber ? { panNumber: String(panNumber).replace(/\s+/g, "").toUpperCase() } : {}),
      status: normalizedStatus,
      isPrimary: true,
      addedAt: user.panDetails?.addedAt || new Date()
    };

    await user.save();

    res.json({
      message: "PAN status updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        panDetails: user.panDetails
      }
    });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    if (String(req.user._id) === String(req.params.id)) {
      const error = new Error("You cannot delete your own account");
      error.statusCode = 400;
      throw error;
    }

    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    next(error);
  }
};

export const getRoles = async (req, res, next) => {
  try {
    const { Role } = await import("../models/Role.js");
    const roles = await Role.find().sort({ createdAt: -1 });
    res.json(roles);
  } catch (error) {
    next(error);
  }
};

export const createRole = async (req, res, next) => {
  try {
    const { Role } = await import("../models/Role.js");
    const { name, displayName, description, permissions } = req.body;

    if (!name || !displayName) {
      const error = new Error("Name and displayName are required");
      error.statusCode = 400;
      throw error;
    }

    const existingRole = await Role.findOne({ name: name.toUpperCase() });
    if (existingRole) {
      const error = new Error("Role already exists");
      error.statusCode = 400;
      throw error;
    }

    const role = new Role({
      name: name.toUpperCase(),
      displayName,
      description,
      permissions: permissions || [],
      isDefault: false,
      isSystemRole: false
    });

    const savedRole = await role.save();
    res.status(201).json(savedRole);
  } catch (error) {
    next(error);
  }
};

export const updateRole = async (req, res, next) => {
  try {
    const { Role } = await import("../models/Role.js");
    const { id } = req.params;
    const { displayName, description, permissions } = req.body;

    const role = await Role.findById(id);
    if (!role) {
      const error = new Error("Role not found");
      error.statusCode = 404;
      throw error;
    }

    if (role.isSystemRole) {
      const error = new Error("Cannot modify system roles");
      error.statusCode = 400;
      throw error;
    }

    if (displayName !== undefined) role.displayName = displayName;
    if (description !== undefined) role.description = description;
    if (permissions !== undefined) role.permissions = permissions;

    const updatedRole = await role.save();
    res.json(updatedRole);
  } catch (error) {
    next(error);
  }
};

export const deleteRole = async (req, res, next) => {
  try {
    const { Role } = await import("../models/Role.js");
    const { id } = req.params;

    const role = await Role.findById(id);
    if (!role) {
      const error = new Error("Role not found");
      error.statusCode = 404;
      throw error;
    }

    if (role.isSystemRole) {
      const error = new Error("Cannot delete system roles");
      error.statusCode = 400;
      throw error;
    }

    const usersWithRole = await User.countDocuments({ role: role.name });
    if (usersWithRole > 0) {
      const error = new Error(`Cannot delete role. ${usersWithRole} user(s) assigned to this role.`);
      error.statusCode = 400;
      throw error;
    }

    await Role.findByIdAndDelete(id);
    res.json({ message: "Role deleted successfully" });
  } catch (error) {
    next(error);
  }
};

export const getPendingUsers = async (req, res, next) => {
  try {
    const pendingUsers = await User.find({ status: "pending" }).select("-password").sort({ createdAt: -1 });
    res.json(pendingUsers);
  } catch (error) {
    next(error);
  }
};

export const approveUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    if (user.status !== "pending") {
      const error = new Error("User is not pending approval");
      error.statusCode = 400;
      throw error;
    }

    user.status = "active";
    user.approvedAt = new Date();
    user.approvedBy = req.user._id;

    await user.save();

    res.json({
      message: "User approved successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        approvedAt: user.approvedAt
      }
    });
  } catch (error) {
    next(error);
  }
};

export const rejectUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    if (user.status !== "pending") {
      const error = new Error("User is not pending approval");
      error.statusCode = 400;
      throw error;
    }

    user.status = "rejected";
    user.approvedBy = req.user._id;

    await user.save();

    res.json({
      message: "User rejected successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status
      }
    });
  } catch (error) {
    next(error);
  }
};
