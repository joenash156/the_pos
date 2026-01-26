import express, { Router } from "express";
import usersRouter from "./usersRoutes";
import adminRouter from "./adminRoutes";
import categoriesRouter from "./categoriesRoutes";
import productsRouter from "./productsRoutes";
import salesRouter from "./salesRoutes";

const router: Router = express.Router();

router.use("/user", usersRouter);
router.use("/admin", adminRouter);
router.use("/category", categoriesRouter);
router.use("/product", productsRouter)
router.use("/sales", salesRouter)

export default router;