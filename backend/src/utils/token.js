import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export const signToken = (user) => {
  return jwt.sign(
    {
      sub: user._id,
      role: user.role
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
};
