import express, { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireAdmin } from "../middlewares/role.middleware";
import { createCategory, deleteCategory, getAllCategories, getCategoryById, updateCategory } from "../controllers/categoriesControllers";
import { validateUUID } from "../middlewares/uuidValidation.middleware";


const router: Router = express.Router();

// router to create/insert a category (only executed by admins)
router.post("/create", requireAuth, requireAdmin, createCategory);

// router to get all categories (only executed by authenticated users)
router.get("/get_all", requireAuth, getAllCategories);

// router to get a category (only executed by authenticated users)
router.get("/:id", requireAuth, validateUUID, getCategoryById);

// router to update a category (only executed by admins)
router.patch("/:id/update", requireAuth, requireAdmin, validateUUID, updateCategory);

// router to delete a category (only executed by admins)
router.delete("/:id/delete", requireAuth, requireAdmin, validateUUID, deleteCategory);



export default router;