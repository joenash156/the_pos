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

  } catch(err: unknown) {
    
  }
}