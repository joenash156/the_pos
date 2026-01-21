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
    .trim()
    .regex(/^\+?[0-9]{9,15}$/, "Invalid phone number")
    .optional(),

  other_phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9]{9,15}$/, "Invalid phone number")
    .optional(),
};


export const createUserSchema = z.object({
  ...userBaseSchema,

  email: z
    .email("Invalid email address")
    .trim()
    .transform(email => email.toLowerCase()),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100)
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character")
    .regex(/^\S+$/, "Password must not contain spaces"),
});

export const loginUserSchema = z.object({
  email: z
    .email("Invalid email address")
    .trim()
    .transform(email => email.toLowerCase()),

  password: z
    .string()
    .min(1, "Password is required"),
});

export const updateUserProfileSchema = z
  .object(userBaseSchema)
  .partial();

export const changePasswordSchema = z.object({
  current_password: z
    .string()
    .min(1, "Current password is required"),
  new_password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100)
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character")
    .regex(/^\S+$/, "Password must not contain spaces"),
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

export const updateUserRoleSchema = z.object({
  role: z.enum(["admin", "cashier"]),
});

export const forgotPasswordSchema = z.object({
  email: z
    .email("Invalid email address")
    .trim()
    .transform(email => email.toLowerCase()),
})
