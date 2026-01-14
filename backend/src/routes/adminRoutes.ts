import express, { Router } from "express";
import { requireAdmin } from "../middlewares/role.middleware";
import { requireAuth } from "../middlewares/auth.middleware";
import { getAllCashiers } from "../controllers/adminControllers";

const router: Router = express.Router();

// router to get all cashiers (only executed by admins)
router.get("/cashiers", requireAuth, requireAdmin, getAllCashiers);


export default router;