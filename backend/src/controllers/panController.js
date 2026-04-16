import { User } from "../models/User.js";

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

export const getMyPan = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    res.json({
      panDetails: user.panDetails || null
    });
  } catch (error) {
    next(error);
  }
};

export const upsertMyPan = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    const panNumber = String(req.body.panNumber || "")
      .replace(/\s+/g, "")
      .toUpperCase();

    if (!PAN_REGEX.test(panNumber)) {
      const error = new Error("Invalid PAN format. Expected format like ABCDE1234F");
      error.statusCode = 400;
      throw error;
    }

    user.panDetails = {
      ...(user.panDetails?.toObject?.() || user.panDetails || {}),
      panNumber,
      status: String(req.body.status || user.panDetails?.status || "pending").toLowerCase(),
      isPrimary: req.body.isPrimary ?? true,
      addedAt: user.panDetails?.addedAt || new Date()
    };

    await user.save();

    res.json({
      panDetails: user.panDetails
    });
  } catch (error) {
    next(error);
  }
};
