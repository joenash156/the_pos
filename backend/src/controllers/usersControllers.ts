import { compareHashedItem, hashItem } from "../utils/hashing"
import db from "../configs/database";
import { Request, Response } from "express"
import { ResultSetHeader, RowDataPacket } from "mysql2";
import { createUserSchema, loginUserSchema } from "../validators/user.schema";
import { ZodError } from "zod";
import { signAccessToken, signRefreshToken } from "../utils/jwt";

// controller to create/insert/signup new user
export const createUser = async (req: Request, res:Response): Promise<void> => {

  try {

    // get user inputs from the request body
    const validatedUserData = createUserSchema.parse(req.body);
    
    const { firstname, lastname, othername, email, password } = validatedUserData;

    // check if there is a user with this email
    const [existingUsers] = await db.query<RowDataPacket[]>("SELECT email from users WHERE email = ?", [email]);

    // fail if email is used
    if(existingUsers.length > 0) {
      res.status(409).json({
        success: false,
        error: "A user with this email already exists!"
      });
      return;
    }

    // get user id and hashed password
    const hashedPassword = await hashItem(password);
    
    // insert user into the database
    await db.query<ResultSetHeader>("INSERT INTO users (firstname, lastname, othername, email, password_hash) VALUES (?, ?, ?, ?, ?)", [firstname, lastname, othername ?? null, email, hashedPassword]);

    // return user initial user info
    res.status(201).json({
      success: true,
      message: "User created successfully!✅", 
      user: {
        firstname,
        lastname,
        othername,
        email,
        role: "cashier"
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

      console.error("Failed to create user: ", err);
      res.status(500).json({
        success: false,
        error: "Failed to create user. Internal server error!"
      });
      return
  }
  
}

// controller to login user
export const loginUser = async (req: Request, res: Response): Promise<void> => {
  try {
    // validate user's inputs (email and password)
    const validatedUserData = loginUserSchema.parse(req.body);

    const { email, password } = validatedUserData;

    // check if the user exists
    const [rows] = await db.query<RowDataPacket[]>("SELECT id, firstname, lastname, othername, email, password_hash, phone, other_phone, avatar_url, theme_preference, is_approved, is_profile_complete, role, created_at, updated_at FROM users WHERE email = ?", [email]);

    if(rows.length === 0) {
      res.status(401).json({
        success: false,
        error: "Invalid email or password!"
      });
      return;
    }

    const user = rows[0]!;

    // Check validity of user's password
    const isMatch = await compareHashedItem(password, user.password_hash);

    if(!isMatch) {
      res.status(401).json({
        success: false,
        error: "Invalid email or password!"
      });
      return;
    }

    if(!user.is_approved) {
      res.status(403).json({
        success: false,
        error: "User account pending approval. Be sure your administrator approves you!",
      });
      return;
    }

    // sign/generate refresh and access tokens at login
    const accessToken = await signAccessToken({ id: user.id, email: user.email });
    const refreshToken = await signRefreshToken({ id: user.id, email: user.email });

    // store refresh token in httpOnly cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production" ? true : false,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    // hash refresh token
    const hashedRefreshToken = await hashItem(refreshToken);

    const lastLoginAt = new Date();

    // update users table with hashed refresh token and last login at
    await db.query<ResultSetHeader>("UPDATE users SET refresh_token_hash = ?, last_login_at = ? WHERE id = ?", [hashedRefreshToken, lastLoginAt, user.id]);

    // return success message and user details
    res.status(200).json({
      success: true,
      message: "User logged in successfully!✅",
      accessToken,
      user: {
        id: user.id,
        firstname: user.firstname,
        lastname: user.lastname,
        othername: user.othername,
        email: user.email,
        phone: user.phone,
        other_phone: user.other_phone,
        avatar_url: user.avatar_url,
        theme_preference: user.theme_preference,
        is_approved: user.is_approved,
        is_profile_complete: user.is_profile_complete,
        role: user.role,
        last_login_at: lastLoginAt,
        created_at: user.created_at
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

      console.error("Failed to login user: ", err);
      res.status(500).json({
        success: false,
        error: "Failed to login user. Internal server error!"
      });
      return
  }
}
