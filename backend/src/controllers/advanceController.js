import { SalaryAdvance } from "../models/SalaryAdvance.js";
import { REQUEST_STATUS } from "../constants/status.js";

export const createAdvance = async (req, res, next) => {
  try {
    if (String(req.user?.status || "").toLowerCase() !== "active") {
      const error = new Error("Only active users can create salary advances");
      error.statusCode = 403;
      throw error;
    }

    const { amount, reason, neededBy } = req.body;
    const numericAmount = Number(amount);
    const advance = await SalaryAdvance.create({
      user: req.user._id,
      amount: numericAmount,
      tdsRate: 0,
      tdsAmount: 0,
      netAmount: numericAmount,
      reason,
      neededBy
    });

    res.status(201).json(advance);
  } catch (error) {
    next(error);
  }
};

export const getMyAdvances = async (req, res, next) => {
  try {
    const advances = await SalaryAdvance.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(advances);
  } catch (error) {
    next(error);
  }
};

export const getMyAdvanceById = async (req, res, next) => {
  try {
    const advance = await SalaryAdvance.findOne({ _id: req.params.id, user: req.user._id });
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

export const updateMyAdvance = async (req, res, next) => {
  try {
    const advance = await SalaryAdvance.findOne({ _id: req.params.id, user: req.user._id });
    if (!advance) {
      const error = new Error("Advance not found");
      error.statusCode = 404;
      throw error;
    }

    if (advance.status !== REQUEST_STATUS.PENDING) {
      const error = new Error("Only pending salary advances can be edited");
      error.statusCode = 400;
      throw error;
    }

    const { amount, reason, neededBy } = req.body;

    if (amount !== undefined) {
      advance.amount = Number(amount);
      // TDS is applied only at approval time, so keep pending edits tax-free.
      advance.tdsRate = 0;
      advance.tdsAmount = 0;
      advance.netAmount = advance.amount;
    }
    if (reason !== undefined) advance.reason = reason;
    if (neededBy !== undefined) advance.neededBy = neededBy;

    await advance.save();
    res.json(advance);
  } catch (error) {
    next(error);
  }
};
