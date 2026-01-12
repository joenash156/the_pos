// validators/user.schema.ts
import { z } from "zod";
import { capitalizeName } from "../utils/normalize";


const userBaseSchema = {
  firstname: z
    .string()
    .min(2, "First name must be at least 2 characters")
    .max(50)
    .transform(capitalizeName),

  lastname: z
    .string()
    .min(2, "Last name must be at least 2 characters")
    .max(50)
    .transform(capitalizeName),

  othername: z
    .string()
    .min(2)
    .max(50)
    .transform(capitalizeName)
    .optional(),

  phone: z
    .string()
    .regex(/^\+?[0-9]{9,15}$/, "Invalid phone number")
    .optional(),

  other_phone: z
    .string()
    .regex(/^\+?[0-9]{9,15}$/, "Invalid phone number")
    .optional(),

  avatar_url: z.string().url("Invalid avatar URL").optional(),

  theme_preference: z.enum(["light", "dark"]).optional(),
};


export const createUserSchema = z.object({
  ...userBaseSchema,

  email: z
    .email("Invalid email address")
    .transform(email => email.toLowerCase()),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100),

  role: z.enum(["admin", "cashier"]).optional(),
});

export const loginUserSchema = z.object({
  email: z
    .email("Invalid email address")
    .transform(email => email.toLowerCase()),

  password: z
    .string()
    .min(1, "Password is required"),
});

export const updateUserProfileSchema = z
  .object(userBaseSchema)
  .partial();

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(8),
  newPassword: z.string().min(8),
});

export const approveUserSchema = z.object({
  is_approved: z.boolean(),
});
