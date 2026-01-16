import db from "../configs/database";
import { Request, Response } from "express"
import { ResultSetHeader, RowDataPacket } from "mysql2"; 
import { ZodError } from "zod";
import { createCategoryShema } from "../validators/category.schema";


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
    await db.query<ResultSetHeader>("INSERT INTO categories (name, description) VALUES (?, ?)", [name, description]);

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

    let query = `SELECT * FROM categories`;

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