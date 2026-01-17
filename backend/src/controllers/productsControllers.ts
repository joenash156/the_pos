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

    // check if category truly exists
    const [categoryRows] = await db.query<RowDataPacket[]>("SELECT id, name FROM categories WHERE id = ?", [category_id]);

    if(categoryRows.length === 0) {
      res.status(404).json({
        success: false,
        error: "Category not found!"
      });
      return;
    }

    // check if product with the same name and category already exist
    const [existingProductRows] = await db.query<RowDataPacket[]>("SELECT id FROM products WHERE LOWER(name) = LOWER(?) AND category_id = ?", [name, category_id]);

    if(existingProductRows.length > 0) {
      res.status(409).json({
        success: false,
        error: "Product with this name already exists in the category!"
      });
      return;
    }

    // insert product into the database
    await db.query<ResultSetHeader>("INSERT INTO products (name, price, category_id, description, stock, image_url) VALUES (?, ?, ?, ?, ?, ?)", [name, price, category_id, description || null, stock, image_url || null]);

    res.status(201).json({
      success: true,
      message: "Product created successfully!✅",
      product: {
        category_id,
        name,
        description,
        price,
        stock,
        category_name: categoryRows[0]!.name,
        image_url: image_url || null,
      }
    });
    return;

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