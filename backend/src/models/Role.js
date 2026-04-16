import mongoose from "mongoose";

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true
    },
    displayName: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    isDefault: {
      type: Boolean,
      default: false
    },
    isSystemRole: {
      type: Boolean,
      default: false // ADMIN and EMPLOYEE are system roles
    },
    permissions: {
      type: [String],
      default: []
    }
  },
  { timestamps: true }
);

// Prevent deletion of system roles
roleSchema.pre("findByIdAndDelete", async function (next) {
  const doc = await this.model.findById(this.getFilter()._id);
  if (doc && doc.isSystemRole) {
    throw new Error("Cannot delete system roles");
  }
  next();
});

export const Role = mongoose.model("Role", roleSchema);
