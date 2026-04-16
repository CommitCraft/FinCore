import { User } from "../models/User.js";
import { Role } from "../models/Role.js";

export const seedUsers = async () => {
  try {
    // Check if admin user already exists
    const adminExists = await User.findOne({ email: "admin@finance.local" });
    
    if (!adminExists) {
      // Get the ADMIN role
      const adminRole = await Role.findOne({ name: "ADMIN" });
      
      if (adminRole) {
        const adminUser = await User.create({
          name: "Finance Administrator",
          email: "admin@finance.local",
          password: "Admin@12345",
          role: "ADMIN",
          bankDetails: {
            accountHolderName: "Finance Dept",
            bankName: "Default Bank",
            accountNumber: "1000000000",
            ifscCode: "DEFAULT01",
            branch: "Admin",
            upiId: "finance@admin",
            status: "approved",
            reviewedAt: new Date()
          }
        });
        console.log("✓ Default admin user created (admin@finance.local / Admin@12345)");
      } else {
        console.warn("⚠ ADMIN role not found - cannot create admin user");
      }
    } else {
      let updated = false;
      if (!adminExists.status) {
        adminExists.status = "active";
        updated = true;
      }
      if (!adminExists.registrationSource) {
        adminExists.registrationSource = "admin";
        updated = true;
      }
      if (!adminExists.approvedAt) {
        adminExists.approvedAt = new Date();
        updated = true;
      }

      if (updated) {
        await adminExists.save();
        console.log("✓ Existing admin user normalized for approval workflow");
      }
      console.log("✓ Admin user already exists");
    }
  } catch (error) {
    console.error("Error seeding users:", error.message);
  }
};
