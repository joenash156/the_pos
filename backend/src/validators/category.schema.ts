import { z } from "zod";
import { capitalizeName } from "../utils/normalize";


export const createCategoryShema = z.object({
  name: z
    .string()
    .min(2, "Category name must be at least 2 characters")
    .max(20, "Category name cannot exceed 20 characters")
    .transform(capitalizeName),
  
  description: z
    .string()
    .min(2, "Category description must be at least 2 characters")
    .max(100, "Category description cannot exceed 100 characters")
})