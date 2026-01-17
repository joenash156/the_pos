import { z } from "zod";
import { capitalizeName } from "../utils/normalize";
import { isUUID } from "../utils/checkID";

export const createProductSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Product name must be at least 2 characters")
    .max(100, "Product name cannot exceed 100 characters")
    .transform(capitalizeName),

  description: z
    .string()
    .trim()
    .max(500, "Description cannot exceed 500 characters")
    .optional(),

  price: z
    .number("Price must be a number" )
    .positive("Price must be greater than zero"),

  stock: z
    .number()
    .int("Stock must be an integer")
    .min(0, "Stock cannot be negative")
    .optional()
    .default(0),

  category_id: z
    .string()
    .refine((id) => isUUID(id), { message: "Invalid category ID" }),

  image_url: z
    .url("Image URL must be a valid URL")
    .optional()
});

export const updateProductBaseSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Product name must be at least 2 characters")
    .max(100, "Product name cannot exceed 100 characters")
    .transform(capitalizeName)
    .optional(),

  description: z
    .string()
    .trim()
    .max(500, "Description cannot exceed 500 characters")
    .optional(),

  price: z
    .number("Price must be a number" )
    .positive("Price must be greater than zero")
    .optional(),

  stock: z
    .number()
    .int("Stock must be an integer")
    .min(0, "Stock cannot be negative")
    .optional()
    .default(0),
  
  category_id: z
  .string()
  .refine((id) => isUUID(id), { message: "Invalid category ID" })
  .optional(),

  image_url: z
    .url("Image URL must be a valid URL")
    .optional()
});