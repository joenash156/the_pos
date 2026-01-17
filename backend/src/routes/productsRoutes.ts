import express, { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireAdmin } from "../middlewares/role.middleware";
import { createProduct } from "../controllers/productsControllers";

const router: Router = express.Router();

// router to create/insert a product (only executed by admins)
router.post("/create", requireAuth, requireAdmin, createProduct);


export default router;