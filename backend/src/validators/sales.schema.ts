import { z } from "zod";
import { isUUID } from "../utils/checkID";

export const createSaleSchema = z.object({
  payment_method: z
    .enum(["cash", "card", "mobile"]),

  items: z
    .array(
      z.object({
        product_id: z
          .string()
          .refine((id) => isUUID(id), { message: "Invalid product ID" }),

        quantity: z
          .number()
          .int("Quantity must be an integer")
          .min(1, "Quantity must be at least 1"),
      })
    )
    .min(1, "At least one product is required"),
});
