import db from "../configs/database";
import { Request, Response } from "express"
import { ResultSetHeader, RowDataPacket } from "mysql2"; 
import { ZodError } from "zod";


export const createProduct = async (req: Request, res: Response): Promise<void> => {
  
}