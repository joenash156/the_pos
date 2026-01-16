import express, { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireAdmin } from "../middlewares/role.middleware";
import { createCategory, getAllCategories } from "../controllers/categoriesControllers";


const router: Router = express.Router();

// router to create/insert a category (only executed by admins)
router.post("/create", requireAuth, requireAdmin, createCategory);

// router to get all categories (only executed by authenticated users)
router.get("/get_all", requireAuth, getAllCategories);


export default router;