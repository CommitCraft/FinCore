import { User } from "../models/User.js";
import { signToken } from "../utils/token.js";
import { ROLES } from "../constants/roles.js";

const buildUserResponse = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  status: user.status,
  phone: user.phone,
  address: user.address,
  bankDetails: user.bankDetails,
  panDetails: user.panDetails
});

export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      const error = new Error("name, email and password are required");
      error.statusCode = 400;
      throw error;
    }

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) {
      const error = new Error("Email already registered");
      error.statusCode = 409;
      throw error;
    }

    // Public registration creates pending users with EMPLOYEE role
    const user = await User.create({
      name,
      email,
      password,
      role: "EMPLOYEE",
      status: "pending",
      registrationSource: "self"
    });

    res.status(201).json({
      message: "Registration successful. Your account is pending admin approval.",
      user: buildUserResponse(user)
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: String(email).toLowerCase() });
    if (!user || !(await user.comparePassword(password))) {
      const error = new Error("Invalid credentials");
      error.statusCode = 401;
      throw error;
    }

    // Backward compatibility for older users created before status workflow.
    if (!user.status) {
      user.status = "active";
      if (!user.registrationSource) {
        user.registrationSource = "admin";
      }
      await user.save();
    }

    // Check if user account is active
    if (user.status !== "active") {
      const error = new Error(
        user.status === "pending"
          ? "Your account is pending admin approval"
          : `Your account is ${user.status}`
      );
      error.statusCode = 403;
      throw error;
    }

    const token = signToken(user);
    res.json({
      token,
      user: buildUserResponse(user)
    });
  } catch (error) {
    next(error);
  }
};

export const me = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    res.json({ user: buildUserResponse(user) });
  } catch (error) {
    next(error);
  }
};

export const updateMe = async (req, res, next) => {
  try {
    const { name, email, password, role, phone, address } = req.body;

    if (email && email.toLowerCase() !== req.user.email) {
      const exists = await User.findOne({ email: email.toLowerCase(), _id: { $ne: req.user._id } });
      if (exists) {
        const error = new Error("Email already registered");
        error.statusCode = 409;
        throw error;
      }
    }

    if (role) {
      const { Role } = await import("../models/Role.js");
      const roleExists = await Role.findOne({ name: String(role).toUpperCase() });
      if (!roleExists) {
        const error = new Error("Invalid role");
        error.statusCode = 400;
        throw error;
      }
      req.user.role = roleExists.name;
    }

    if (name) {
      req.user.name = name;
    }

    if (email) {
      req.user.email = email.toLowerCase();
    }

    if (password) {
      req.user.password = password;
    }

    if (phone !== undefined) {
      req.user.phone = phone;
    }

    if (address !== undefined) {
      req.user.address = address;
    }

    const bankDetails = req.body.bankDetails || {};
    const nextBankDetails = {
      accountHolderName: bankDetails.accountHolderName ?? req.body.accountHolderName,
      bankName: bankDetails.bankName ?? req.body.bankName,
      accountNumber: bankDetails.accountNumber ?? req.body.accountNumber,
      ifscCode: bankDetails.ifscCode ?? req.body.ifscCode,
      branch: bankDetails.branch ?? req.body.branch,
      upiId: bankDetails.upiId ?? req.body.upiId
    };

    const hasBankInput = Object.values(nextBankDetails).some((value) => value !== undefined);

    req.user.bankDetails = {
      ...(req.user.bankDetails?.toObject?.() || req.user.bankDetails || {}),
      ...Object.fromEntries(Object.entries(nextBankDetails).filter(([, value]) => value !== undefined)),
      ...(hasBankInput ? { status: "pending", reviewedAt: null } : {})
    };

    if (req.body.panDetails && typeof req.body.panDetails === "object") {
      req.user.panDetails = {
        ...(req.user.panDetails?.toObject?.() || req.user.panDetails || {}),
        ...Object.fromEntries(Object.entries(req.body.panDetails).filter(([, value]) => value !== undefined))
      };
    }

    await req.user.save();

    res.json({
      user: buildUserResponse(req.user)
    });
  } catch (error) {
    next(error);
  }
};
