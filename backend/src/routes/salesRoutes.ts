import express, { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { createSale } from "../controllers/salesControllers";

const router: Router = express.Router();

// router to create a sale
router.post("/create", requireAuth, createSale)


export default router;