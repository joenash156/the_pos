import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production"]).default("development"),

  RESEND_API_KEY: z.string(),
  MAIL_FROM: z.email(),
  CLIENT_URL: z.url(),
});

export const mailEnv = envSchema.parse(process.env);