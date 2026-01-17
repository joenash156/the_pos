import db from "../configs/database";
import { Request, Response } from "express"
import { ResultSetHeader, RowDataPacket } from "mysql2"; 
import { ZodError } from "zod";
import { createProductSchema } from "../validators/products.schema";


export const createProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    // validate inputs from request body
    const validateProductData = createProductSchema.parse(req.body);

    const { name, price, category_id, description, stock, image_url } = validateProductData;

    

  } catch(err: unknown) {
      // check if the error comes from zod
      if (err instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: "Invalid request data",
          issues: err.issues,
        });
        return;
      } 

      console.error("Failed to create product: ", err);
      res.status(500).json({
        success: false,
        error: "Internal server error whiles creating product!"
      });
      return
  }
}