import { Role } from "../models/Role.js";

export const seedRoles = async () => {
  try {
    // Check if roles already exist
    const adminRole = await Role.findOne({ name: "ADMIN" });
    const employeeRole = await Role.findOne({ name: "EMPLOYEE" });

    if (!adminRole) {
      await Role.create({
        name: "ADMIN",
        displayName: "Administrator",
        description: "Admin with full access and control",
        isDefault: false,
        isSystemRole: true,
        permissions: ["*"]
      });
      console.log("ADMIN role created");
    }

    if (!employeeRole) {
      await Role.create({
        name: "EMPLOYEE",
        displayName: "Employee",
        description: "Regular employee with limited access",
        isDefault: true,
        isSystemRole: true,
        permissions: ["view_own_requests", "create_request", "edit_own_pending"]
      });
      console.log("EMPLOYEE role created");
    }
  } catch (error) {
    console.error("Error seeding roles:", error);
  }
};
