import dotenv from "dotenv";

dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: process.env.PORT || 5000,
  corsOrigins: process.env.CORS_ORIGIN || "",
  rateLimitWindow: Number(process.env.RATE_LIMIT_WINDOW) || 15,
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX) || 100,

  // database config envs
  dbHOST: process.env.DB_HOST as string,
  dbUSER: process.env.DB_USER as string,
  dbPASSWORD: process.env.DB_PASSWORD as string,
  dbNAME: process.env.DB_NAME as string,
  dbPORT: Number(process.env.DB_PORT),
};
