import { Request, Response, NextFunction } from "express";

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'admin') {
    res.status(403).json({
      success: false,
      error: "Administrator access required. Unauthorized users cannot access this."
    });
    return;
  }
  next();
};
