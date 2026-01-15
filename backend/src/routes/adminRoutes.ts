import express, { Router } from "express";
import { requireAdmin } from "../middlewares/role.middleware";
import { requireAuth } from "../middlewares/auth.middleware";
import { approveCashier, getAllCashiers, getCashierById } from "../controllers/adminControllers";

const router: Router = express.Router();

// router to get all cashiers (only executed by admins)
router.get("/cashiers", requireAuth, requireAdmin, getAllCashiers);

// router to get a cashier by id (only executed by admins)
router.get("/cashier/:id", requireAuth, requireAdmin, getCashierById);

// router to approve a cashier by id (only executed by admins)
router.get("/approve_cashier/:id", requireAuth, requireAdmin, approveCashier);


export default router;