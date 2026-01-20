import { compareHashedItem, hashItem } from "../utils/hashing"
import crypto from "crypto";
import db from "../configs/database";
import { Request, Response } from "express"
import { ResultSetHeader, RowDataPacket } from "mysql2";
import { changePasswordSchema, changeThemePreferenceSchema, createUserSchema, deleteUserSchema, loginUserSchema, updateUserProfileSchema } from "../validators/user.schema";
import { ZodError } from "zod";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt";
import { generateToken } from "../utils/generateToken";
import { sendVerificationEmail } from "../emails/emails";
import { resendVerificationSchema } from "../validators/mailer.schema";

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

    // generate email verification token
    const { plainToken, tokenHash } = await generateToken();

    const emailVerifyExpires = new Date(
      Date.now() + 20 * 60 * 1000 
    );
    
    // insert user into the database
    await db.query<ResultSetHeader>("INSERT INTO users (firstname, lastname, othername, email, password_hash, email_verify_token_hash, email_verify_expires) VALUES (?, ?, ?, ?, ?, ?, ?)", [firstname, lastname, othername || null, email, hashedPassword, tokenHash, emailVerifyExpires]);

    // send verification email
    await sendVerificationEmail(email, firstname, plainToken);

    // return user initial user info
    res.status(201).json({
      success: true,
      message: "User created successfully!✅. Please check your email to verify your account.", 
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

// controller to verify user email
export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== "string") {
      res.status(400).json({
        success: false,
        error: "Verification token is required",
      });
      return;
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    // find user with valid token
    const [users] = await db.query<RowDataPacket[]>("SELECT id, is_email_verified FROM users WHERE email_verify_token_hash = ? AND email_verify_expires > NOW()", [tokenHash]);

    if (users.length === 0) {
      res.status(400).json({
        success: false,
        error: "Invalid or expired verification token",
      });
      return;
    }

    // check if already verified
    if (users[0]!.is_email_verified) {
      res.status(409).json({
        success: false,
        error: "Email is already verified",
      });
      return;
    }

    // verify email & clear token
    await db.query<ResultSetHeader>(`UPDATE users SET is_email_verified = TRUE, email_verify_token_hash = NULL, email_verify_expires = NULL WHERE id = ?`, [users[0]!.id]);

    res.status(200).json({
      success: true,
      message: "Email verified successfully!✅ You can now log in.",
    });
    return;

  } catch (err: unknown) {
      console.error("Email verification failed:", err);
      res.status(500).json({
        success: false,
        error: "Internal server error while verifying email",
      });
      return;
    }
}

// controller to resend verification email
export const resendVerificationEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedUserData = resendVerificationSchema.parse(req.body);

    const { email } = validatedUserData;

    const [rows] = await db.query<RowDataPacket[]>("SELECT id, firstname, is_email_verified FROM users WHERE email = ?", [email]);

    if (rows.length === 0) {
      res.status(404).json({
        success: false,
        error: "No account found with this email",
      });
      return;
    }

    // prevent resending if already verified
    if (rows[0]!.is_email_verified) {
      res.status(400).json({
        success: false,
        error: "Email is already verified",
      });
      return;
    }

    // generate new verification token
    const { plainToken, tokenHash } = await generateToken();
   
    const emailVerifyExpires = new Date(Date.now() + 20 * 60 * 1000);

    // update token in DB (invalidate old one)
    await db.query<ResultSetHeader>("UPDATE users SET email_verify_token_hash = ?, email_verify_expires = ? WHERE id = ?", [tokenHash, emailVerifyExpires, rows[0]!.id]);


    // send verification email
    await sendVerificationEmail(email, rows[0]!.firstname, plainToken)

    res.status(200).json({
      success: true,
      message: "Verification email resent successfully!✅",
    });
    return;

  } catch (err) {
      // check if the error comes from zod
      if (err instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: "Invalid request data",
          issues: err.issues,
        });
        return;
      } 

      console.error("Failed to resend verification email:", err);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
      return;
    }
};

// controller to login user
export const loginUser = async (req: Request, res: Response): Promise<void> => {
  try {
    // validate user's inputs (email and password)
    const validatedUserData = loginUserSchema.parse(req.body);

    const { email, password } = validatedUserData;

    // check if the user exists
    const [rows] = await db.query<RowDataPacket[]>("SELECT id, firstname, lastname, othername, email, is_email_verified, password_hash, phone, other_phone, avatar_url, theme_preference, is_approved, is_profile_complete, role, created_at, updated_at FROM users WHERE email = ?", [email]);

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

    // ensure user email is verified before login
    if(user.role !== "admin" && !user.is_email_verified) {
      res.status(403).json({
        success: false,
        error: "Verify your email to login!"
      });
      return;
    }
    
    // enforces cashiers only but not admins approval before login
    if(user.role !== "admin" && !user.is_approved) {
      res.status(403).json({
        success: false,
        error: "Cashier account pending approval. Be sure your administrator approves you!",
      });
      return;
    }

    // sign/generate refresh and access tokens at login
    const accessToken = await signAccessToken({ id: user.id, email: user.email, role: user.role });
    const refreshToken = await signRefreshToken({ id: user.id, email: user.email, role: user.role });

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
        is_email_verified: user.is_email_verified,
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

// controller to get user profile
export const getUserProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if(!userId) {
      res.status(401).json({
        success: false,
        error: "Unauthorized to get profile!"
      });
      return;
    }

    // fetch user info/details/profile from the database
    const [rows] = await db.query<RowDataPacket[]>("SELECT id, firstname, lastname, othername, email, is_email_verified, phone, other_phone, avatar_url, theme_preference, is_approved, role, last_login_at, is_profile_complete, created_at, updated_at FROM users WHERE id = ? LIMIT 1", [userId]);

    if(rows.length === 0) {
      res.status(404).json({
        success: false,
        error: "User not found"
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "User profile found!✅",
      user: rows[0]
    })
    return;

  } catch(err: unknown) {
      console.error("Failed to fetch user profile:", err);
      res.status(500).json({
        success: false,
        error: "Failed to fetch user profile. Internal server error",
      });
      return;
    }
}

// controller to update user profile dynamically
export const updateUserProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if(!userId) {
      res.status(401).json({
        success: false,
        error: "Unauthorized to update user profile!"
      });
      return;
    }

    const validatedUserData = updateUserProfileSchema.parse(req.body);

    const { firstname, lastname, othername, phone, other_phone } = validatedUserData;

    // check if user is truly in there database
    const [rows] = await db.query<RowDataPacket[]>("SELECT id FROM users WHERE id = ? LIMIT 1", [userId]);

    if(rows.length === 0) {
      res.status(404).json({
        success: false,
        error: "User account might have been deleted!"
      });
      return;
    }

    // arrays for the dynamic fields and values
    const fields: string[] = [];
    const values: (string | number)[] = [];

    if(firstname !== undefined) {
      fields.push("firstname = ?");
      values.push(firstname);
    }
    if(lastname !== undefined) {
      fields.push("lastname = ?");
      values.push(lastname);
    }
    if(othername !== undefined) {
      fields.push("othername = ?");
      values.push(othername)
    }
    if(phone !== undefined) {
      fields.push("phone = ?");
      values.push(phone);
    }
    if(other_phone !== undefined) {
      fields.push("other_phone = ?");
      values.push(other_phone);
    }

    if(fields.length === 0) {
      res.status(400).json({
        success: false,
        error: "No field provided to update user profile"
      })
      return;
    }

    values.push(userId);

    // make the users update in the database
    await db.query<ResultSetHeader>(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`, values);

    // auto-mark profile as complete if requirements are met
    await db.query<ResultSetHeader>("UPDATE users SET is_profile_complete = TRUE WHERE id = ? AND firstname IS NOT NULL AND lastname IS NOT NULL AND phone IS NOT NULL", [userId]);
    
    // return updated user profile after update
    const [result] = await db.query<RowDataPacket[]>("SELECT id, firstname, lastname, othername, email, phone, other_phone, avatar_url, theme_preference, is_approved, role, last_login_at, is_profile_complete, created_at, updated_at FROM users WHERE id = ? LIMIT 1", [userId]);

    res.status(200).json({
      success: true,
      message: "User profile updated successfully!",
      user: result[0]
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

      console.error("Failed to update user profile:", err);
      res.status(500).json({
        success: false,
        error: "Failed to update user profile. Internal server error",
      });
      return;
    }
}

// controller to update/change password
export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    // get user id from payload/auth header
    const userId = req.user?.id;

    if(!userId) {
      res.status(401).json({
        success: false,
        error: "Unauthorized to change password!"
      });
      return;
    }

    // validate request body
    const validatedUserData = changePasswordSchema.parse(req.body);

    const { current_password, new_password } = validatedUserData;

    // check if user exists
    const [rows] = await db.query<RowDataPacket[]>("SELECT password_hash FROM users WHERE id = ? LIMIT 1", [userId]);

    if(rows.length === 0) {
      res.status(404).json({
        success: false,
        error: "User not found. Account might have been deleted!"
      });
      return;
    }

    // verify the current password
    const isMatch = await compareHashedItem(current_password, rows[0]!.password_hash);

    if(!isMatch) {
      res.status(401).json({
        success: false,
        error: "Incorrect password!"
      });
      return;
    }

    // check to see if new password provided is the same as current password
    const isSamePassword = await compareHashedItem(new_password, rows[0]!.password_hash);

    if (isSamePassword) {
      res.status(400).json({
        success: false,
        error: "New password must be different from current password",
      });
      return;
    }

    // go ahead and hash new password
    const newHashedPassword = await hashItem(new_password);

    // store the new hashed password into the database
    const [result] = await db.query<ResultSetHeader>("UPDATE users SET password_hash = ? WHERE id = ?", [newHashedPassword, userId]);

    if(result.affectedRows === 0) {
      res.status(401).json({
        success: false,
        error: "Unable to udpate user password. Try again!"
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "User password changed successfully!✅"
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

      console.error("Failed to change password:", err);
      res.status(500).json({
        success: false,
        error: "Failed to change user password. Internal server error",
      });
      return;
    }
}

// controller to update/change theme preference
export const changeThemePreference = async (req: Request, res: Response): Promise<void> => {
  try {
    // get user id from payload/auth header
    const userId = req.user?.id;

    if(!userId) {
      res.status(401).json({
        success: false,
        error: "Unauthorized to change theme preference!"
      });
      return;
    }

    const validatedUserData = changeThemePreferenceSchema.parse(req.body);

    const { theme_preference } = validatedUserData;

    const [result] = await db.query<ResultSetHeader>("UPDATE users SET theme_preference = ? WHERE id = ?", [theme_preference, userId]);

    if(result.affectedRows === 0) {
      res.status(404).json({
        success: false,
        error: "Unable to change theme preference. Try again!"
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Theme preference changed successfully!✅",
      user: {
        id: userId,
        theme_preference
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

      console.error("Failed to change theme:", err);
      res.status(500).json({
        success: false,
        error: "Failed to change theme. Internal server error",
      });
      return;
  }
}

// controller to generate/get new access token
export const generateNewAccessToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken }: { refreshToken?: string } = req.cookies;

    if(!refreshToken) {
      res.status(400).json({
        success: false,
        error: "Refresh token is required!"
      })
      return;
    }

    // verify refresh token
    const payload = await verifyRefreshToken(refreshToken);

    // check to see if refresh token exists
    const [rows] = await db.query<RowDataPacket[]>("SELECT id, email, refresh_token_hash, role FROM users WHERE id = ?", [payload.id]);

    if(rows.length === 0) {
      res.status(404).json({
        success: false,
        error: "No user found with the refresh token"
      });
      return;
    }

    if(!rows[0]!.refresh_token_hash) {
      res.status(404).json({
        success: false,
        error: "Refresh token does not exist"
      });
      return;
    }

    // verify refresh token
    const isMatch = await compareHashedItem(refreshToken, rows[0]!.refresh_token_hash);

    if(!isMatch) {
      res.status(401).json({
        success: false,
        error: "Refresh token mismatch!"
      });
      return;
    }

    // generate new refresh and access token
    const newAccessToken = await signAccessToken({ id: rows[0]!.id, email: rows[0]!.email, role: rows[0]!.role });
    const newRefreshToken = await signRefreshToken({ id: rows[0]!.id, email: rows[0]!.email, role: rows[0]!.role });

    // hash new refresh token
    const newHashedRefreshToken = await hashItem(newRefreshToken);

    // insert new refresh token hash into the database
    await db.query<ResultSetHeader>("UPDATE users SET refresh_token_hash = ? WHERE id = ?", [newHashedRefreshToken, rows[0]!.id]);

    // store new refresh token in httpOnly cookie
    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production" ? true : false,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })

    res.status(200).json({
      success: true,
      accessToken: newAccessToken
    });
    return;

  } catch(err: any) {
      console.error("Failed to refresh: ", err);
      // clear the refresh token from the browser cookie
      res.clearCookie("refreshToken", {
        httpOnly: true,
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        path: "/",
      });

      if (err.name === "TokenExpiredError") {
        res.status(401).json({
          success: false,
          error: "Refresh token expired",
        });
        return;
      } else {
        res.status(401).json({
          success: false,
          error: "Invalid refresh token",
        });
        return;
      }
    }
}

// controller to change avatar

// controller to logout user
export const logoutUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        error: "Refresh token required! User might be logged out already"
      });
      return;
    }

    let userId: string | undefined;

    try {
      // verify refresh token
      const payload = await verifyRefreshToken(refreshToken);
      userId = payload.id;
    } catch (err: any) {
      // decode manually only if expired
      if (err.name === "TokenExpiredError") {
        try {
          const base64Payload = refreshToken.split(".")[1];
          const decoded = JSON.parse(Buffer.from(base64Payload, "base64").toString());
          userId = decoded.id;
        } catch {
          userId = undefined;
        }
      }
    }

    if (!userId) {
      // clear cookie anyway
      res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        path: "/",
      });

      res.status(400).json({
        success: false,
        error: "Invalid refresh token. Cannot log out properly."
      });
      return;
    }

    // revoke refresh token in database
    const [result] = await db.query<ResultSetHeader>("UPDATE users SET refresh_token_hash = NULL WHERE id = ?", [userId]);

    if (result.affectedRows === 0) {
      res.status(404).json({
        success: false,
        error: "Unable to revoke refresh token"
      });
      return;
    }

    // clear the refresh token cookie
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
    });

    res.status(200).json({
      success: true,
      message: "User logged out successfully!✅"
    });

  } catch (err) {
    console.error("Failed to log out user:", err);
    res.status(500).json({
      success: false,
      error: "Failed to log out user. Internal server error!"
    });
  }
};

// controller to delete user account
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try{
    const userId: string = req.user!.id;

    if(!userId) {
      res.status(401).json({
        success: false,
        error: "Unauthorized to change password!"
      });
      return;
    } 

    const validatedUserData = deleteUserSchema.parse(req.body);

    const { password } = validatedUserData;
  
    const [rows] = await db.query<RowDataPacket[]>("SELECT password_hash FROM users WHERE id = ?", [userId]);

    if(rows.length === 0) {
      res.status(404).json({
        success: false,
        error: "user not found!"
      })
      return;
    }

    // if user exists, we verify the user passowrd entered
    const isMatch = await compareHashedItem(password, rows[0]?.password_hash);

    if(!isMatch) {
      res.status(401).json({
        success: false,
        error: "Password entered is incorrect!"
      })
      return;
    }

    // delete user from the datebase
    const [results] = await db.query<ResultSetHeader>("DELETE FROM users WHERE id = ?", [userId]);

    if(results.affectedRows === 0) {
      res.status(404).json({
        success: false,
        error: "Unable to delete user!"
      })
      return;
    }

    res.status(200).json({
      success: true,
      message: "User deleted successfully!✅",
    })
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
      console.error("Failed to delete user!: ", err);
      res.status(500).json({
        success: false,
        error: "Failed to delete user. Internal server error"
      });
      return;
    }

}
