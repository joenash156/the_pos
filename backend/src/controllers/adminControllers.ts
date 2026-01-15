import db from "../configs/database";
import { Request, Response } from "express"
import { ResultSetHeader, RowDataPacket } from "mysql2";
import { isUUID } from "../utils/checkID";  
import { success } from "zod";


// controller to get all cashiers
export const getAllCashiers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { is_approved, search, sortBy } = req.query;

    let query = `
      SELECT 
        id, firstname, lastname, othername, email, phone, other_phone, 
        is_approved, role, last_login_at, is_profile_complete, created_at
      FROM users
      WHERE role = ?`;

    const params: (string | number)[] = ["cashier"];

    if (is_approved !== undefined) {
      query += " AND is_approved = ?";
      params.push(is_approved === "true" ? 1 : 0);
    }

    if (search && typeof search === "string") {
      query += " AND (firstname LIKE ? OR lastname LIKE ? OR email LIKE ?)";
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    const sortColumn = sortBy === "lastname" ? "lastname" : "created_at";
    query += ` ORDER BY ${sortColumn} ASC`;

    const [cashiers] = await db.query<RowDataPacket[]>(query, params);

    if (cashiers.length === 0) {
      res.status(200).json({
        success: true,
        counts: 0,
        message: "No cashiers found"
      });
      return;
    }

    res.status(200).json({
      success: true,
      counts: cashiers.length,
      message: "Cashiers fetched successfully!✅",
      cashiers
    });

  } catch (err: unknown) {
    console.error("Failed fetching all cashiers:", err);
    res.status(500).json({
      success: false,
      error: "Internal server error while fetching cashiers"
    });
  }
};

// controller get a user by id
export const getCashierById = async (req: Request, res: Response): Promise<void> => {
  try {
    // get id from request params
    const  { id } = req.params;

    // check if there is an id at ll
    if (typeof id !== "string") {
      res.status(400).json({
        success: false,
        error: "Valid user id is required",
      });
      return;
    }

    // check if the id provided is a uuid
    if(!isUUID(id)) {
      res.status(400).json({
        success: false,
        error: "Invalid user id"
      });
      return;
    }

    // get user details from the database
    const [rows] = await db.query<RowDataPacket[]>("SELECT id, firstname, lastname, othername, email, phone, other_phone, is_approved, role, last_login_at, is_profile_complete, created_at FROM users WHERE id = ? AND role = ?", [id, "cashier"]);

    if(rows.length === 0) {
      res.status(404).json({
        success: false,
        error: "Cashier not found!"
      });
      return;
    }
  
    res.status(200).json({
      success: true,
      message: "Cashier found!✅",
      cashier: rows[0]
    });
    return;    

  } catch(err: unknown) {
      console.error("Failed fetching cashier:", err);
      res.status(500).json({
        success: false,
        error: "Internal server error while fetching cashier"
      });
  }
}

// controller to approve a cashier
export const approveCashier = async (req: Request, res: Response): Promise<void> => {
  try {
    // get id from request params
    const  { id } = req.params;

    // check if there is an id at ll
    if (typeof id !== "string") {
      res.status(400).json({
        success: false,
        error: "Valid user id is required",
      });
      return;
    }

    // check if the id provided is a uuid
    if(!isUUID(id)) {
      res.status(400).json({
        success: false,
        error: "Invalid user id"
      });
      return;
    }

    // check if cashier exists
    const [rows] = await db.query<RowDataPacket[]>("SELECT id, email, is_approved FROM users WHERE id = ? AND role = ?", [id, "cashier"]);

    if(rows.length === 0) {
      res.status(404).json({
        success: false,
        error: "Cashier not found!"
      });
      return;
    }

    // check if cashier is already approved
    if(rows[0]!.is_approved) {
      res.status(409).json({
        success: true,
        message: "Cashier is already approved!✅"
      });
      return;
    }

    // now approve cashier if not approved
    const [result] = await db.query<ResultSetHeader>("UPDATE users SET is_approved = TRUE WHERE id = ?", [id]);

    if(result.affectedRows === 0) {
      res.status(404).json({
        success: false,
        error: "Unable to approve cashier!"
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Cashier approved successfully!✅"
    });
    return;

  } catch(err: unknown) {
      console.error("Failed approving cashier:", err);
      res.status(500).json({
        success: false,
        error: "Internal server error while approving cashier"
      });
  }
}