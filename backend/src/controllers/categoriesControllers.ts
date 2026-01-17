import db from "../configs/database";
import { Request, Response } from "express"
import { ResultSetHeader, RowDataPacket } from "mysql2"; 
import { ZodError } from "zod";
import { createCategoryShema, updateCategorySchema } from "../validators/category.schema";


// controller to create/insert a category
export const createCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    // validate request body
    const validatedCategoryData = createCategoryShema.parse(req.body);
    
    const { name, description } = validatedCategoryData;

    // check if category already exists in database
    const [rows] = await db.query<RowDataPacket[]>("SELECT name FROM categories WHERE LOWER(name) = LOWER(?)", [name]);
    
    if(rows.length > 0) {
      res.status(409).json({
        success: false,
        error: "Category already exists"
      });
      return;
    }

    // insert category into database since it does not exist
    await db.query<ResultSetHeader>("INSERT INTO categories (name, description) VALUES (?, ?)", [name, description || null]);

    res.status(201).json({
      success: true,
      message: "Category created successfully!✅",
      category: {
        name,
        description
      }
    });
    return;

  } catch(err: unknown) {
      if (err instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: "Invalid request data",
          issues: err.issues,
        });
        return;
      }

    console.error("Failed to create category: ", err);
    res.status(500).json({
      success: false,
      error: "Internal server error while creating category"
    });
    return;
  }
}

// controller to get all categories
export const getAllCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, sortBy, limitTo, offsetTo } = req.query;

    let query = `SELECT id, name, description, created_at, updated_at FROM categories`;

    const params: (string | number)[] = [];

    if (search && typeof search === "string") {
      query += " WHERE LOWER(name) LIKE ?";
      const searchPattern = `%${search}%`;
      params.push(searchPattern);
    }

    const sortColumn = typeof sortBy === "string" && sortBy === "name" ? "name" : "created_at";
    query += ` ORDER BY ${sortColumn} ASC`;

    const limit = limitTo ? Number(limitTo) : 20;
    const offset = offsetTo ? Number(offsetTo) : 0;
    query += " LIMIT ? OFFSET ?";
    params.push(limit, offset);


    const [categories] = await db.query<RowDataPacket[]>(query, params);

    if(categories.length === 0) {
       res.status(200).json({
        success: true,
        counts: 0,
        message: "No categories found"
      });
      return;
    }

    res.status(200).json({
      success: true,
      counts: categories.length,
      message: "Categories fetched successfully!✅",
      categories
    });
    return;

  } catch(err: unknown) {
      console.error("Failed to get all categories: ", err);
      res.status(500).json({
        success: false,
        error: "Internal server error while getting all categories"
      });
      return;
  }
}

// controller to get a category by id
export const getCategoryById = async (req: Request, res: Response): Promise<void> => {
  try {
    // get id from request params
    const { id } = req.params;

    const [rows] = await db.query<RowDataPacket[]>("SELECT id, name, description, created_at, updated_at FROM categories WHERE id = ?", [id]);

    if(rows.length === 0) {
      res.status(404).json({
        success: false,
        error: "No category found!"
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Category found!✅",
      count: 1,
      category: rows[0]
    });
    return;

  } catch(err: unknown) {
      console.error("Failed to get category: ", err);
      res.status(500).json({
        success: false,
        error: "Internal server error while getting category"
      });
      return;
  }
}

// controller to update a category
export const updateCategory = async (req: Request, res: Response): Promise<void> => {
  try{
    // get id from request params
    const { id } = req.params;

    const validatedCategoryData = updateCategorySchema.parse(req.body);
    
    const { name, description } = validatedCategoryData;

    // check if category exists
    const [rows] = await db.query<RowDataPacket[]>("SELECT name FROM categories WHERE id = ?", [id]);

    if(rows.length === 0) {
      res.status(404).json({
        success: false,
        error: "No category found to update",
      });
      return;
    }

    // check for duplicate upon update
    if(name) {
      const [cat] = await db.query<RowDataPacket[]>("SELECT name, description FROM categories WHERE LOWER(name) = LOWER(?) AND id != ?", [name, id]);

      if(cat.length > 0) {
        res.status(409).json({
          success: false,
          error: "Category already exists"
        });
        return;
      }
    }

    const fields: string[] = [];
    const values: (string | string[] | number | undefined)[] = [];

    if(name !== undefined) {
      fields.push("name = ?");
      values.push(name);
    }
    if(description !== undefined) {
      fields.push("description = ?");
      values.push(description);
    }

    if(fields.length === 0) {
      res.status(400).json({
        success: false,
        error: "No field provided to udpate category"
      });
      return;
    }

    values.push(id);

    // update category
    const [result] = await db.query<ResultSetHeader>(`UPDATE categories SET ${fields.join(", ")} WHERE id = ?`, values);

    if(result.affectedRows === 0) {
      res.status(404).json({
        success: false,
        error: "Unable to update category"
      });
      return;
    }

    // fetch the updated category details
    const [updatedCat] = await db.query<RowDataPacket[]>("SELECT id, name, description, created_at, updated_at FROM categories WHERE id = ?", [id]);

    res.status(200).json({
      success: true,
      message: "Category updated successfully!✅",
      count: 1,
      category: updatedCat[0]
    });
    return;

  } catch(err: unknown) {
      if (err instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: "Invalid request data",
          issues: err.issues,
        });
        return;
      }

      console.error("Failed to update category: ", err);
      res.status(500).json({
        success: false,
        error: "Internal server error while updating category"
      });
      return;
  }
}

// controller to delete a category
export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    // get id from request params
    const { id } = req.params;

    // check if category exists
    const [rows] = await db.query<RowDataPacket[]>("SELECT id, name FROM categories WHERE id = ?", [id]);

    if(rows.length === 0) {
      res.status(404).json({
        success: false,
        error: "No category found to delete",
      });
      return;
    }

    // check if any product is using the category
    const [prod] = await db.query<RowDataPacket[]>("SELECT name FROM products WHERE category_id = ?", [id]);

    if(prod.length > 0) {
      res.status(409).json({
        success: false,
        error: "Category cannot be deleted because it is used by existing products"
      });
      return;
    }

    // delete category from database
    const [result] = await db.query<ResultSetHeader>("DELETE FROM categories WHERE id = ?", [id]);

    if(result.affectedRows === 0) {
      res.status(404).json({
        success: false,
        error: "Unable to delete category"
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Category deleted successfully!✅",
      category: {
        id,
        name: rows[0]?.name
      }
    });
    return;    

  } catch(err: unknown) {
      console.error("Failed to delete category: ", err);
      res.status(500).json({
        success: false,
        error: "Internal server error while deleting category"
      });
      return;
  }
}