import mongoose from "mongoose";
import { env } from "./env.js";
import { seedRoles } from "../seeds/roleSeeder.js";
import { seedUsers } from "../seeds/userSeeder.js";

export const connectDB = async () => {
  const options = {
    maxPoolSize: env.mongoMaxPoolSize,
    minPoolSize: env.mongoMinPoolSize,
    maxIdleTimeMS: env.mongoMaxIdleTimeMS,
    serverSelectionTimeoutMS: env.mongoServerSelectionTimeoutMS,
    connectTimeoutMS: env.mongoConnectTimeoutMS,
    socketTimeoutMS: env.mongoSocketTimeoutMS
  };

  Object.keys(options).forEach((key) => {
    if (typeof options[key] !== "number" || Number.isNaN(options[key])) {
      delete options[key];
    }
  });

  await mongoose.connect(env.mongoUri, options);
  console.log("MongoDB connected");
  
  // Seed default roles first, then users
  await seedRoles();
  await seedUsers();
};
