import { Role } from "../models/Role.js";

export const getAllRoles = async (req, res, next) => {
  try {
    const roles = await Role.find().sort({ createdAt: -1 });
    res.json(roles);
  } catch (error) {
    next(error);
  }
};

export const getRoleById = async (req, res, next) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }
    res.json(role);
  } catch (error) {
    next(error);
  }
};

export const createRole = async (req, res, next) => {
  try {
    const { name, displayName, description, permissions } = req.body;

    // Validate required fields
    if (!name || !displayName) {
      return res.status(400).json({ message: "Name and displayName are required" });
    }

    // Check if role already exists
    const existingRole = await Role.findOne({ name: name.toUpperCase() });
    if (existingRole) {
      return res.status(400).json({ message: "Role already exists" });
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
    const { id } = req.params;
    const { displayName, description, permissions, isDefault } = req.body;

    const role = await Role.findById(id);
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    // System roles cannot have certain fields changed
    if (role.isSystemRole) {
      return res.status(400).json({ message: "Cannot modify system roles" });
    }

    // Update allowed fields
    if (displayName !== undefined) role.displayName = displayName;
    if (description !== undefined) role.description = description;
    if (permissions !== undefined) role.permissions = permissions;
    if (isDefault !== undefined) role.isDefault = isDefault;

    const updatedRole = await role.save();
    res.json(updatedRole);
  } catch (error) {
    next(error);
  }
};

export const deleteRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const role = await Role.findById(id);
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    // Prevent deletion of system roles
    if (role.isSystemRole) {
      return res.status(400).json({ message: "Cannot delete system roles" });
    }

    // Check if any users have this role
    const User = (await import("../models/User.js")).User;
    const usersWithRole = await User.countDocuments({ role: role.name });
    if (usersWithRole > 0) {
      return res.status(400).json({ message: `Cannot delete role. ${usersWithRole} user(s) assigned to this role.` });
    }

    await Role.findByIdAndDelete(id);
    res.json({ message: "Role deleted successfully" });
  } catch (error) {
    next(error);
  }
};
