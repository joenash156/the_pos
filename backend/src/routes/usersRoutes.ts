import express, { Router } from "express";
import { changePassword, changeThemePreference, createUser, deleteUser, forgotPassword, generateNewAccessToken, getUserProfile, loginUser, logoutUser, resendVerificationEmail, updateUserProfile, verifyEmail } from "../controllers/usersControllers";
import { requireAuth } from "../middlewares/auth.middleware";


const router: Router = express.Router();

// router to register user
router.post("/signup", createUser);

// router to verify email
router.get("/verify_email", verifyEmail)

// router to resend verification email
router.post("/resend_verification_email", resendVerificationEmail)

// router to login in user
router.post("/login", loginUser);

// router to get user profile only when logged in (protected route)
router.get("/profile", requireAuth, getUserProfile);

// router to update user profile only when logged in (protected route)
router.patch("/update_profile", requireAuth, updateUserProfile);

// router to update/change user password when logged in (protected router)
router.patch("/change_password", requireAuth, changePassword);

// router for forgot password
router.post("/forgot_password", forgotPassword)

// router to update/change user theme preference when logged in (pretected router)
router.patch("/change_theme_preference", requireAuth, changeThemePreference);

// router to refresh to generate new access token
router.post("/refresh", generateNewAccessToken);

// router to log out user
router.post("/logout", logoutUser);

// router to delete user when logged in (protected route)
router.delete("/delete", requireAuth, deleteUser);


export default router;