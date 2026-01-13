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
  current_password: z.string().min(8),
  new_password: z.string().min(8),
});

export const changeAvatarSchema = z.object({
  avatar_url: z
    .url("Invalid avatar URL"),
});

export const changeThemePreferenceSchema = z.object({
  theme_preference: z
    .enum(["light", "dark"])
})

export const deleteUserSchema = z.object({
  password: z
    .string()
    .min(1, "Password is required"),
})

export const approveUserSchema = z.object({
  is_approved: z.boolean(),
});
