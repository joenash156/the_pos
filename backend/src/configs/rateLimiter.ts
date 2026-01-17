import rateLimit from "express-rate-limit";
import { env } from "./env";

export const rateLimiter = rateLimit({
  windowMs: env.rateLimitWindow * 60 * 1000,
  max: env.rateLimitMax,
  standardHeaders: true,   
  legacyHeaders: false,  
  message: {
    success: false,
    error: "Too many requests, please try again later!",
  },
});
