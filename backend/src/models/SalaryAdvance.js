import mongoose from "mongoose";
import { REQUEST_STATUS } from "../constants/status.js";

const salaryAdvanceSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    tdsRate: { type: Number, min: 0, max: 100, default: 0 },
    tdsAmount: { type: Number, min: 0, default: 0 },
    netAmount: { type: Number, min: 0, default: 0 },
    reason: { type: String, required: true, trim: true },
    neededBy: { type: Date, required: true },
    status: {
      type: String,
      enum: Object.values(REQUEST_STATUS),
      default: REQUEST_STATUS.PENDING,
      index: true
    },
    adminNote: { type: String, trim: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date }
  },
  { timestamps: true }
);

export const SalaryAdvance = mongoose.model("SalaryAdvance", salaryAdvanceSchema);
