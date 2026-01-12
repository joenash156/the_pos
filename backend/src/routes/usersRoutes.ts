import express, { Router } from "express";
import { createUser, loginUser } from "../controllers/usersControllers";
//import { requireAuth } from "../middlewares/auth.middleware";


const router: Router = express.Router();

// router to register user
router.post("/signup", createUser);

// router to login in user
router.post("/login", loginUser);

// // router to get user profile only when logged in (protected route)
// router.get("/profile", requireAuth, getUserProfile);

// // router to update user profile only when logged in (protected route)
// router.patch("/update_profile", requireAuth, updateUserProfile);

// // router to delete user when logged in (protected route)
// router.delete("/delete", requireAuth, deleteUser);

// // router to update/change user password when logged in (protected router)
// router.patch("/change_password", requireAuth, changePassword);

// // router to update/change user theme preference when logged in (pretected router)
// router.patch("/change_theme_preference", requireAuth, changeThemePreference);

// // router to refresh to generate new access token
// router.post("/refresh", generateNewAccessToken);

// // router to log out user
// router.post("/logout", logoutUser);

export default router;