import db from "../configs/database";
import { Request, Response } from "express"
import { ResultSetHeader, RowDataPacket } from "mysql2";


// controller to get all cashiers
export const getAllCashiers = async (req: Request, res: Response): Promise<void> => {
  
}