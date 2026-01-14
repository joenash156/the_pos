import db from "../configs/database";
import { Request, Response } from "express"
import { RowDataPacket } from "mysql2";


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
