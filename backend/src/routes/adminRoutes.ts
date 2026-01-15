import express, { Router } from "express";
import { requireAdmin } from "../middlewares/role.middleware";
import { requireAuth } from "../middlewares/auth.middleware";
import { getAllCashiers, getCashiersById } from "../controllers/adminControllers";

const router: Router = express.Router();

// router to get all cashiers (only executed by admins)
router.get("/cashiers", requireAuth, requireAdmin, getAllCashiers);

// router to get a cashier by id (only executed by admins)
router.get("/cashier/:id", requireAuth, requireAdmin, getCashiersById);


export default router;