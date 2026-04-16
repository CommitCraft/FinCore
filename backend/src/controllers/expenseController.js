import { ExpenseReport } from "../models/ExpenseReport.js";
import { storageService } from "../services/storage/index.js";
import { REQUEST_STATUS } from "../constants/status.js";
import { env } from "../config/env.js";
import path from "path";
import fs from "fs/promises";

export const createExpense = async (req, res, next) => {
  try {
    if (String(req.user?.status || "").toLowerCase() !== "active") {
      const error = new Error("Only active users can create expense reports");
      error.statusCode = 403;
      throw error;
    }

    const { title, amount, description, reportDate } = req.body;
    if (!req.file) {
      const error = new Error("Receipt file is required");
      error.statusCode = 400;
      throw error;
    }

    const receipt = await storageService.saveFile(req.file.buffer, req.file.originalname, req.file.mimetype);

    const expense = await ExpenseReport.create({
      user: req.user._id,
      title,
      amount: Number(amount),
      description,
      reportDate,
      receipt
    });

    res.status(201).json(expense);
  } catch (error) {
    next(error);
  }
};

export const getMyExpenses = async (req, res, next) => {
  try {
    const expenses = await ExpenseReport.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(expenses);
  } catch (error) {
    next(error);
  }
};

export const getMyExpenseById = async (req, res, next) => {
  try {
    const expense = await ExpenseReport.findOne({ _id: req.params.id, user: req.user._id });
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

export const updateMyExpense = async (req, res, next) => {
  try {
    const expense = await ExpenseReport.findOne({ _id: req.params.id, user: req.user._id });
    if (!expense) {
      const error = new Error("Expense not found");
      error.statusCode = 404;
      throw error;
    }

    if (expense.status !== REQUEST_STATUS.PENDING) {
      const error = new Error("Only pending expense reports can be edited");
      error.statusCode = 400;
      throw error;
    }

    const { title, amount, description, reportDate } = req.body;

    if (title !== undefined) expense.title = String(title).trim();
    if (amount !== undefined) expense.amount = Number(amount);
    if (description !== undefined) expense.description = description;
    if (reportDate !== undefined) expense.reportDate = reportDate;

    if (req.file) {
      const receipt = await storageService.saveFile(req.file.buffer, req.file.originalname, req.file.mimetype);
      expense.receipt = receipt;
    }

    await expense.save();
    res.json(expense);
  } catch (error) {
    next(error);
  }
};

export const getMyExpenseReceipt = async (req, res, next) => {
  try {
    const expense = await ExpenseReport.findOne({ _id: req.params.id, user: req.user._id });
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
